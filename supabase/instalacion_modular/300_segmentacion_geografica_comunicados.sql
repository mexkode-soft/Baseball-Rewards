-- Home Run Rewards | instalación modular
-- Archivo: 300_segmentacion_geografica_comunicados.sql
-- Propósito:
--   1. Usar el catálogo nacional de estados del perfil en el canal de difusión.
--   2. Cargar municipios según el estado seleccionado.
--   3. Permitir enviar a todo un estado o, opcionalmente, a un municipio.
--   4. Aplicar estado/municipio también al filtro personalizado junto con el nivel.
-- Ejecutar después de: 290_corregir_notificaciones_y_patrocinadores.sql

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

  if v_type in ('location', 'custom') and v_state is null then
    raise exception 'STATE_REQUIRED';
  end if;

  if v_type = 'specific'
     and jsonb_array_length(coalesce(v_audience->'userIds', '[]'::jsonb)) = 0 then
    raise exception 'RECIPIENT_REQUIRED';
  end if;

  if v_idempotency_key is not null then
    select * into v_existing
    from public.broadcasts
    where created_by = v_creator
      and idempotency_key = v_idempotency_key
    limit 1;

    if found then
      select id into v_push_job_id
      from public.push_jobs
      where broadcast_id = v_existing.id
      limit 1;

      return jsonb_build_object(
        'broadcast_id', v_existing.id,
        'recipients', v_existing.recipient_count,
        'push_job_id', v_push_job_id,
        'idempotent', true
      );
    end if;
  end if;

  insert into public.broadcasts(
    title, body, message_type, priority, audience,
    status, sent_at, created_by, idempotency_key
  ) values (
    v_title, v_body, v_message_type, v_priority, v_audience,
    'sent', now(), v_creator, v_idempotency_key
  ) returning id into v_broadcast_id;

  with eligible as (
    select p.id
    from public.profiles p
    where (
      (v_type = 'specific' and p.id::text in (
        select jsonb_array_elements_text(coalesce(v_audience->'userIds', '[]'::jsonb))
      ))
      or (v_type = 'sponsors' and p.role::text = 'sponsor')
      or (v_type not in ('specific', 'sponsors') and p.role::text = 'usuario')
    )
    and (
      v_type not in ('location', 'custom')
      or (
        p.state = v_state
        and (v_municipality is null or p.municipality = v_municipality)
      )
    )
    and (
      v_type not in ('level', 'custom')
      or exists (
        select 1 from public.levels l
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
    select id, v_broadcast_id, v_title, v_body, v_message_type, v_action_url, v_image_url
    from eligible
    on conflict do nothing
    returning id
  )
  select count(*)::integer into v_recipient_count from inserted;

  update public.broadcasts
  set recipient_count = v_recipient_count
  where id = v_broadcast_id;

  if v_recipient_count > 0 then
    insert into public.push_jobs(
      broadcast_id, status, processed_count, delivered_count,
      failed_count, attempts, locked_at, completed_at, last_error, updated_at
    ) values (
      v_broadcast_id, 'pending', 0, 0, 0, 0, null, null, null, now()
    )
    on conflict (broadcast_id) do update
    set status = 'pending', processed_count = 0, delivered_count = 0,
        failed_count = 0, attempts = 0, locked_at = null,
        completed_at = null, last_error = null, updated_at = now()
    returning id into v_push_job_id;
  end if;

  return jsonb_build_object(
    'broadcast_id', v_broadcast_id,
    'recipients', v_recipient_count,
    'push_job_id', v_push_job_id,
    'idempotent', false
  );
end;
$$;

alter function public.publicar_comunicado_seguro(jsonb) owner to postgres;
revoke all on function public.publicar_comunicado_seguro(jsonb) from public;
grant execute on function public.publicar_comunicado_seguro(jsonb) to authenticated, service_role;


notify pgrst, 'reload schema';

select
  to_regprocedure('public.publicar_comunicado_seguro(jsonb)') is not null as rpc_lista;
