-- Home Run Rewards | instalación modular
-- Archivo: 070_recompensas_indices_y_pwa.sql
-- Fuente histórica: 20260802233000_recovery_rewards_performance_pwa.sql
-- Ejecutar únicamente después del archivo anterior.

-- Punto de recuperación funcional 1: recompensas, limpieza segura e índices de rendimiento.

create index if not exists campaigns_active_type_dates_idx
on public.campaigns(type, status, starts_at, ends_at, created_at desc);

create index if not exists qr_codes_campaign_active_idx
on public.qr_codes(campaign_id, is_active, created_at);

create index if not exists participations_user_completed_idx
on public.participations(user_id, status, completed_at desc);

create index if not exists participations_user_campaign_qr_idx
on public.participations(user_id, campaign_id, qr_code_id)
where qr_code_id is not null;

create index if not exists reward_claims_user_campaign_idx
on public.reward_claims(user_id, campaign_id, claimed_at desc);

create or replace function public.get_my_rewards_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with current_user_profile as (
    select p.id, p.total_points
    from public.profiles p
    where p.id = auth.uid()
  ),
  capture_totals as (
    select count(*)::bigint as captures
    from public.participations p
    where p.user_id = auth.uid()
      and p.status = 'completed'
  ),
  prize_totals as (
    select count(*)::bigint as prizes
    from public.reward_claims r
    where r.user_id = auth.uid()
  ),
  reward_items as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'campaignId', r.campaign_id,
          'campaignName', c.name,
          'campaignType', c.type,
          'rewardName', r.reward_name,
          'rewardCode', coalesce(r.reward_code, ''),
          'points', coalesce(p.points_awarded, 0),
          'claimedAt', r.claimed_at
        ) order by r.claimed_at desc
      ),
      '[]'::jsonb
    ) as items
    from public.reward_claims r
    join public.campaigns c on c.id = r.campaign_id
    left join public.participations p on p.id = r.participation_id
    where r.user_id = auth.uid()
  )
  select jsonb_build_object(
    'points', coalesce((select total_points from current_user_profile), 0),
    'captures', coalesce((select captures from capture_totals), 0),
    'prizes', coalesce((select prizes from prize_totals), 0),
    'items', coalesce((select items from reward_items), '[]'::jsonb)
  );
$$;

grant execute on function public.get_my_rewards_dashboard() to authenticated;

-- Reinicia únicamente el progreso del usuario autenticado.
-- Evita borrar por accidente la información de todos los participantes.
create or replace function public.reset_demo_progress()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión';
  end if;

  delete from public.ticket_images
  where submission_id in (
    select id from public.ticket_submissions where user_id = v_user
  );

  delete from public.ticket_submissions where user_id = v_user;
  delete from public.reward_claims where user_id = v_user;
  delete from public.point_transactions where user_id = v_user;
  delete from public.participations where user_id = v_user;

  update public.profiles
  set total_points = 0, updated_at = now()
  where id = v_user;

  update public.qr_codes q
  set total_uses = usage_totals.total_uses
  from (
    select q2.id, count(p.id)::integer as total_uses
    from public.qr_codes q2
    left join public.participations p on p.qr_code_id = q2.id
    group by q2.id
  ) usage_totals
  where q.id = usage_totals.id;
end;
$$;

grant execute on function public.reset_demo_progress() to authenticated;
