-- Home Run Rewards | QR robusto, edición de ubicaciones y vigencia visible de recompensas
-- Archivo: 386_qr_edicion_ubicaciones_y_vigencia_recompensas.sql
-- Ejecutar después de: 385_cierre_campanas_inventario_y_edicion.sql
-- Idempotente.

begin;

-- ---------------------------------------------------------------------------
-- 1. Las ubicaciones se identifican por ID, no por nombre/coordenadas.
--    El índice físico creado en 385 podía impedir mover una ubicación existente
--    si temporalmente coincidía con otra durante una edición.
-- ---------------------------------------------------------------------------
drop index if exists public.campaign_locations_unique_physical_location_idx;

create index if not exists campaign_locations_campaign_active_idx
  on public.campaign_locations(campaign_id, is_active, id);

-- ---------------------------------------------------------------------------
-- 2. Asegurar búsqueda rápida y estable de QR por campaña + hash.
-- ---------------------------------------------------------------------------
create index if not exists qr_codes_campaign_token_active_idx
  on public.qr_codes(campaign_id, token_hash)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- 3. Reparar vigencia de recompensas históricas que se ganaron antes de que
--    expires_at comenzara a persistirse. Usa la vigencia configurada en campaña.
-- ---------------------------------------------------------------------------
update public.reward_claims r
set expires_at = r.claimed_at + make_interval(days => greatest(1, coalesce(c.reward_validity_days, 15)))
from public.campaigns c
where c.id = r.campaign_id
  and r.expires_at is null;

-- ---------------------------------------------------------------------------
-- 4. Dashboard autoritativo. Calcula una vigencia efectiva incluso para un
--    registro legado, excluye automáticamente premios vencidos y expone ambas
--    fechas al frontend.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_rewards_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with my_points as (
    select coalesce(sum(pt.points), 0)::bigint as points
    from public.point_transactions pt
    where pt.user_id = auth.uid()
  ),
  capture_totals as (
    select count(*)::bigint as captures
    from public.participations p
    where p.user_id = auth.uid()
      and p.status = 'completed'
  ),
  normalized_rewards as (
    select
      r.id,
      r.campaign_id,
      c.name as campaign_name,
      c.type::text as campaign_type,
      r.reward_name,
      coalesce(r.reward_code, '') as reward_code,
      coalesce(p.points_awarded, 0) as points,
      r.claimed_at,
      coalesce(
        r.expires_at,
        r.claimed_at + make_interval(days => greatest(1, coalesce(c.reward_validity_days, 15)))
      ) as effective_expires_at,
      lower(coalesce(r.status, 'active')) as reward_status
    from public.reward_claims r
    join public.campaigns c on c.id = r.campaign_id
    left join public.participations p on p.id = r.participation_id
    where r.user_id = auth.uid()
  ),
  valid_rewards as (
    select *
    from normalized_rewards
    where reward_status in ('active', 'claimed', 'reserved')
      and effective_expires_at > now()
  ),
  reward_summary as (
    select
      count(*)::bigint as prizes,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'campaignId', campaign_id,
            'campaignName', campaign_name,
            'campaignType', campaign_type,
            'rewardName', reward_name,
            'rewardCode', reward_code,
            'points', points,
            'claimedAt', claimed_at,
            'expiresAt', effective_expires_at
          )
          order by claimed_at desc
        ),
        '[]'::jsonb
      ) as items
    from valid_rewards
  )
  select jsonb_build_object(
    'points', coalesce((select points from my_points), 0),
    'captures', coalesce((select captures from capture_totals), 0),
    'prizes', coalesce((select prizes from reward_summary), 0),
    'items', coalesce((select items from reward_summary), '[]'::jsonb)
  );
$$;

alter function public.get_my_rewards_dashboard() owner to postgres;
revoke all on function public.get_my_rewards_dashboard() from public;
grant execute on function public.get_my_rewards_dashboard() to authenticated, service_role;

-- Marcar como expirados los que ya vencieron. El dashboard ya los oculta aunque
-- este UPDATE no vuelva a ejecutarse; esto solo mantiene coherencia administrativa.
update public.reward_claims
set status = 'expired'
where expires_at <= now()
  and lower(coalesce(status, 'active')) in ('active', 'claimed', 'reserved');

-- Mantener explícitos los permisos de las RPC usadas por el lector QR.
grant execute on function public.scan_qr(uuid,text) to authenticated, service_role;
grant execute on function public.get_my_rewards_dashboard() to authenticated, service_role;

grant select, insert, update, delete on public.campaign_locations to authenticated;
grant select on public.qr_codes to authenticated;

notify pgrst, 'reload schema';
commit;

-- Verificación rápida
select
  to_regprocedure('public.scan_qr(uuid,text)') as scan_qr,
  to_regprocedure('public.get_my_rewards_dashboard()') as rewards_dashboard,
  (select count(*) from public.reward_claims where expires_at is null) as recompensas_sin_vigencia;
