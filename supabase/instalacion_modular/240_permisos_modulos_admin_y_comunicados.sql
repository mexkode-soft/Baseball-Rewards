-- Home Run Rewards | instalación modular
-- Archivo: 240_permisos_modulos_admin_y_comunicados.sql
-- Corrige privilegios SQL, políticas RLS y la función de comunicados para:
-- campañas, temporadas, promociones, anuncios y canal de difusión.
-- Ejecutar después de 230_permisos_operativos_y_administrativos.sql.

-- ---------------------------------------------------------------------------
-- 1. Privilegios SQL necesarios para el cliente autenticado
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated, anon;

-- Lecturas públicas controladas por RLS.
grant select on table
  public.campaigns,
  public.promotions,
  public.announcements
  to anon, authenticated;

-- Operación administrativa. RLS sigue siendo la autoridad final.
grant select, insert, update, delete on table
  public.campaigns,
  public.campaign_questions,
  public.campaign_locations,
  public.qr_codes,
  public.brand_rules,
  public.brand_locations,
  public.seasons,
  public.promotions,
  public.announcements,
  public.broadcasts,
  public.push_jobs
  to authenticated;

-- El administrador necesita consultar perfiles y niveles para segmentar envíos.
grant select on table
  public.profiles,
  public.levels
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Habilitar RLS solo en tablas propias de la aplicación
-- ---------------------------------------------------------------------------

alter table public.campaigns enable row level security;
alter table public.campaign_questions enable row level security;
alter table public.campaign_locations enable row level security;
alter table public.qr_codes enable row level security;
alter table public.brand_rules enable row level security;
alter table public.brand_locations enable row level security;
alter table public.seasons enable row level security;
alter table public.promotions enable row level security;
alter table public.announcements enable row level security;
alter table public.broadcasts enable row level security;
alter table public.push_jobs enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Políticas administrativas idempotentes
-- ---------------------------------------------------------------------------

-- Campañas y sus componentes.
drop policy if exists admin_campaigns_all on public.campaigns;
create policy admin_campaigns_all
on public.campaigns for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_campaign_questions_all on public.campaign_questions;
create policy admin_campaign_questions_all
on public.campaign_questions for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_campaign_locations_all on public.campaign_locations;
create policy admin_campaign_locations_all
on public.campaign_locations for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_qr_codes_all on public.qr_codes;
create policy admin_qr_codes_all
on public.qr_codes for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_brand_rules_all on public.brand_rules;
create policy admin_brand_rules_all
on public.brand_rules for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_brand_locations_all on public.brand_locations;
create policy admin_brand_locations_all
on public.brand_locations for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Temporadas.
drop policy if exists seasons_admin_all on public.seasons;
create policy seasons_admin_all
on public.seasons for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Promociones.
drop policy if exists promotions_admin on public.promotions;
create policy promotions_admin
on public.promotions for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Anuncios de la cinta.
drop policy if exists announcements_admin on public.announcements;
create policy announcements_admin
on public.announcements for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Comunicados y cola push.
drop policy if exists broadcasts_admin_all on public.broadcasts;
create policy broadcasts_admin_all
on public.broadcasts for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists push_jobs_admin on public.push_jobs;
create policy push_jobs_admin
on public.push_jobs for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Función única e idempotente para enviar comunicados
-- ---------------------------------------------------------------------------

-- Elimina la firma antigua para evitar ambigüedad en PostgREST.
drop function if exists public.publish_broadcast(text,text,text,text,jsonb,text,text);

create or replace function public.publish_broadcast(
  p_title text,
  p_body text,
  p_message_type text default 'information',
  p_priority text default 'normal',
  p_audience jsonb default '{"type":"all"}'::jsonb,
  p_action_url text default '/usuario',
  p_image_url text default null,
  p_idempotency_key uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator uuid := auth.uid();
  v_existing public.broadcasts%rowtype;
  v_broadcast_id uuid;
  v_count integer := 0;
  v_type text := coalesce(p_audience->>'type', 'all');
  v_level text := p_audience->>'level';
  v_state text := p_audience->>'state';
  v_amount integer := greatest(1, coalesce(nullif(p_audience->>'amount', '')::integer, 1));
begin
  if v_creator is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_admin() then
    raise exception 'Solo un administrador puede enviar comunicaciones.';
  end if;

  if nullif(trim(p_title), '') is null or nullif(trim(p_body), '') is null then
    raise exception 'El título y el mensaje son obligatorios.';
  end if;

  if p_idempotency_key is not null then
    select * into v_existing
    from public.broadcasts
    where created_by = v_creator
      and idempotency_key = p_idempotency_key;

    if found then
      return jsonb_build_object(
        'broadcast_id', v_existing.id,
        'recipients', v_existing.recipient_count,
        'idempotent', true
      );
    end if;
  end if;

  insert into public.broadcasts(
    title, body, message_type, priority, audience,
    status, sent_at, created_by, idempotency_key
  ) values (
    trim(p_title), trim(p_body), p_message_type, p_priority, p_audience,
    'sent', now(), v_creator, p_idempotency_key
  ) returning id into v_broadcast_id;

  with eligible as (
    select p.id
    from public.profiles p
    where (
      (v_type = 'specific' and p.id::text in (
        select jsonb_array_elements_text(coalesce(p_audience->'userIds', '[]'::jsonb))
      ))
      or (v_type = 'sponsors' and p.role::text = 'sponsor')
      or (v_type not in ('specific', 'sponsors') and p.role::text = 'usuario')
    )
    and (v_type <> 'location' or p.state = v_state)
    and (
      v_type <> 'level'
      or exists (
        select 1
        from public.levels l
        where l.name = v_level
          and l.is_active
          and p.total_points >= l.minimum_points
          and (l.maximum_points is null or p.total_points <= l.maximum_points)
      )
    )
    order by case when v_type = 'random' then random() else 0 end, p.id
    limit case when v_type = 'random' then v_amount else 2147483647 end
  ), inserted as (
    insert into public.notifications(
      user_id, broadcast_id, title, body, type, action_url, image_url
    )
    select
      id, v_broadcast_id, trim(p_title), trim(p_body),
      p_message_type, p_action_url, p_image_url
    from eligible
    on conflict (user_id, broadcast_id) do nothing
    returning 1
  )
  select count(*) into v_count from inserted;

  update public.broadcasts
  set recipient_count = v_count
  where id = v_broadcast_id;

  insert into public.push_jobs(broadcast_id, status, batch_size)
  values (v_broadcast_id, 'pending', 250)
  on conflict (broadcast_id) do nothing;

  return jsonb_build_object(
    'broadcast_id', v_broadcast_id,
    'recipients', v_count,
    'idempotent', false
  );
end;
$$;

alter function public.publish_broadcast(text,text,text,text,jsonb,text,text,uuid)
  owner to postgres;

revoke all on function public.publish_broadcast(text,text,text,text,jsonb,text,text,uuid)
  from public;

grant execute on function public.publish_broadcast(text,text,text,text,jsonb,text,text,uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Asegurar ejecución de temporada activa
-- ---------------------------------------------------------------------------

grant execute on function public.activate_season(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Recargar esquema y verificar
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';

select
  tablename as tabla,
  policyname as politica,
  cmd as operacion
from pg_policies
where schemaname = 'public'
  and tablename in (
    'campaigns', 'campaign_questions', 'campaign_locations', 'qr_codes',
    'brand_rules', 'brand_locations', 'seasons', 'promotions',
    'announcements', 'broadcasts', 'push_jobs'
  )
order by tablename, policyname;
