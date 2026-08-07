-- Home Run Rewards | ajustes operativos de geografía, notificaciones y métricas demo
-- Archivo: 370_ajustes_operativos_geografia_push_metricas.sql
-- Ejecutar después de: 362_reparacion_upsert_user_consents.sql
-- Idempotente.

begin;

-- 1) Segmentación geográfica de campañas y patrocinadores.
alter table public.campaigns add column if not exists target_state text;
alter table public.campaigns add column if not exists target_municipality text;
alter table public.sponsor_organizations add column if not exists state text;

create index if not exists campaigns_target_location_idx
  on public.campaigns(target_state, target_municipality, status);
create index if not exists sponsor_organizations_state_idx
  on public.sponsor_organizations(state) where is_active;

-- 2) La bandeja de cada cuenta únicamente puede leer/modificar sus propias notificaciones.
-- Los mensajes administrativos destinados a administradores ya se insertan con su user_id.
alter table public.notifications enable row level security;
drop policy if exists notifications_self on public.notifications;
create policy notifications_self
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, update on public.notifications to authenticated;

-- 3) Realtime para que la campanita se actualice sin abrirla.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

-- 4) Última versión de publicación de comunicados.
-- Excluye explícitamente al emisor y conserva segmentación por estado/municipio.
create or replace function public.publicar_comunicado_seguro(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator uuid := auth.uid();
  v_title text := trim(coalesce(p_payload->>'title', ''));
  v_body text := trim(coalesce(p_payload->>'body', ''));
  v_message_type text := coalesce(nullif(p_payload->>'messageType', ''), 'information');
  v_priority text := coalesce(nullif(p_payload->>'priority', ''), 'normal');
  v_action_url text := coalesce(nullif(p_payload->>'actionUrl', ''), '/usuario');
  v_image_url text := nullif(p_payload->>'imageUrl', '');
  v_idempotency_key uuid := nullif(p_payload->>'idempotencyKey', '')::uuid;
  v_audience jsonb := coalesce(p_payload->'audience', '{"type":"all"}'::jsonb);
  v_type text := coalesce(v_audience->>'type', 'all');
  v_level text := v_audience->>'level';
  v_state text := nullif(v_audience->>'state', '');
  v_municipality text := nullif(v_audience->>'municipality', '');
  v_amount integer := greatest(1, coalesce(nullif(v_audience->>'amount', '')::integer, 1));
  v_existing public.broadcasts%rowtype;
  v_broadcast_id uuid;
  v_recipient_count integer := 0;
  v_push_job_id uuid;
begin
  if v_creator is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if v_title = '' or v_body = '' then raise exception 'TITLE_AND_BODY_REQUIRED'; end if;
  if v_type in ('location', 'custom') and v_state is null then raise exception 'STATE_REQUIRED'; end if;
  if v_type = 'specific' and jsonb_array_length(coalesce(v_audience->'userIds','[]'::jsonb)) = 0 then
    raise exception 'RECIPIENT_REQUIRED';
  end if;

  if v_idempotency_key is not null then
    select * into v_existing from public.broadcasts
    where created_by=v_creator and idempotency_key=v_idempotency_key limit 1;
    if found then
      select id into v_push_job_id from public.push_jobs where broadcast_id=v_existing.id limit 1;
      return jsonb_build_object('broadcast_id',v_existing.id,'recipients',v_existing.recipient_count,'push_job_id',v_push_job_id,'idempotent',true);
    end if;
  end if;

  insert into public.broadcasts(title,body,message_type,priority,audience,status,sent_at,created_by,idempotency_key)
  values(v_title,v_body,v_message_type,v_priority,v_audience,'sent',now(),v_creator,v_idempotency_key)
  returning id into v_broadcast_id;

  with eligible as (
    select p.id
    from public.profiles p
    where p.id <> v_creator
      and (
        (v_type='specific' and p.id::text in (select jsonb_array_elements_text(coalesce(v_audience->'userIds','[]'::jsonb))))
        or (v_type='sponsors' and p.role::text='sponsor')
        or (v_type not in ('specific','sponsors') and p.role::text='usuario')
      )
      and (
        v_type not in ('location','custom')
        or (p.state=v_state and (v_municipality is null or p.municipality=v_municipality))
      )
      and (
        v_type not in ('level','custom')
        or exists (
          select 1 from public.levels l
          where l.name=v_level and l.is_active
            and p.total_points>=l.minimum_points
            and (l.maximum_points is null or p.total_points<=l.maximum_points)
        )
      )
    order by case when v_type='random' then random() else 0 end, p.id
    limit case when v_type='random' then v_amount else 2147483647 end
  ), inserted as (
    insert into public.notifications(user_id,broadcast_id,title,body,type,action_url,image_url)
    select id,v_broadcast_id,v_title,v_body,v_message_type,v_action_url,v_image_url from eligible
    on conflict do nothing
    returning id
  )
  select count(*)::integer into v_recipient_count from inserted;

  update public.broadcasts set recipient_count=v_recipient_count where id=v_broadcast_id;

  if v_recipient_count>0 then
    insert into public.push_jobs(broadcast_id,status,processed_count,delivered_count,failed_count,attempts,locked_at,completed_at,last_error,updated_at)
    values(v_broadcast_id,'pending',0,0,0,0,null,null,null,now())
    on conflict (broadcast_id) do update set
      status='pending',processed_count=0,delivered_count=0,failed_count=0,attempts=0,
      locked_at=null,completed_at=null,last_error=null,updated_at=now()
    returning id into v_push_job_id;
  end if;

  return jsonb_build_object('broadcast_id',v_broadcast_id,'recipients',v_recipient_count,'push_job_id',v_push_job_id,'idempotent',false);
end;
$$;

alter function public.publicar_comunicado_seguro(jsonb) owner to postgres;
revoke all on function public.publicar_comunicado_seguro(jsonb) from public;
grant execute on function public.publicar_comunicado_seguro(jsonb) to authenticated, service_role;

-- 5) Simulación controlada de 30 días de métricas para demostraciones.
create or replace function public.simular_metricas_campana(p_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_rows integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  select coalesce((value->>'simulatedLocationEnabled')::boolean,false)
  into v_enabled
  from public.app_settings
  where key='demo';

  if not v_enabled then raise exception 'DEMO_LOCATION_REQUIRED'; end if;
  if not exists(select 1 from public.campaigns where id=p_campaign_id) then raise exception 'CAMPAIGN_NOT_FOUND'; end if;

  insert into public.campaign_metrics_daily(
    campaign_id,metric_date,ticket_uploads,valid_tickets,rejected_tickets,
    unique_participants,attributed_sales,rewards_won,rewards_redeemed,points_awarded,updated_at
  )
  select
    p_campaign_id,
    d::date,
    45 + ((extract(day from d)::int * 7) % 55),
    36 + ((extract(day from d)::int * 5) % 44),
    3 + ((extract(day from d)::int * 3) % 10),
    28 + ((extract(day from d)::int * 11) % 48),
    4800 + ((extract(day from d)::int * 1739) % 16500),
    4 + ((extract(day from d)::int * 2) % 13),
    2 + ((extract(day from d)::int * 3) % 9),
    900 + ((extract(day from d)::int * 137) % 3200),
    now()
  from generate_series(current_date - interval '29 days', current_date, interval '1 day') d
  on conflict (campaign_id,metric_date) do update set
    ticket_uploads=excluded.ticket_uploads,
    valid_tickets=excluded.valid_tickets,
    rejected_tickets=excluded.rejected_tickets,
    unique_participants=excluded.unique_participants,
    attributed_sales=excluded.attributed_sales,
    rewards_won=excluded.rewards_won,
    rewards_redeemed=excluded.rewards_redeemed,
    points_awarded=excluded.points_awarded,
    updated_at=now();

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

alter function public.simular_metricas_campana(uuid) owner to postgres;
revoke all on function public.simular_metricas_campana(uuid) from public;
grant execute on function public.simular_metricas_campana(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
commit;

-- Verificación
select column_name from information_schema.columns where table_schema='public' and table_name='campaigns' and column_name in ('target_state','target_municipality') order by column_name;
select column_name from information_schema.columns where table_schema='public' and table_name='sponsor_organizations' and column_name='state';
