-- Punto de ajuste: sincroniza puntos reales y consolida premios del usuario.

create or replace function public.sync_profile_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_user uuid;
  v_new_user uuid;
begin
  v_old_user := case when tg_op in ('UPDATE', 'DELETE') then old.user_id else null end;
  v_new_user := case when tg_op in ('INSERT', 'UPDATE') then new.user_id else null end;

  if v_old_user is not null then
    update public.profiles p
    set total_points = greatest(
          0,
          coalesce((
            select sum(pt.points)
            from public.point_transactions pt
            where pt.user_id = v_old_user
          ), 0)
        ),
        updated_at = now()
    where p.id = v_old_user;
  end if;

  if v_new_user is not null and v_new_user is distinct from v_old_user then
    update public.profiles p
    set total_points = greatest(
          0,
          coalesce((
            select sum(pt.points)
            from public.point_transactions pt
            where pt.user_id = v_new_user
          ), 0)
        ),
        updated_at = now()
    where p.id = v_new_user;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists point_transaction_added on public.point_transactions;
drop trigger if exists point_transactions_sync_profile_points on public.point_transactions;

create trigger point_transactions_sync_profile_points
after insert or update or delete on public.point_transactions
for each row execute function public.sync_profile_points();

-- Corrige saldos históricos que pudieron quedar desfasados.
update public.profiles p
set total_points = greatest(
      0,
      coalesce((
        select sum(pt.points)
        from public.point_transactions pt
        where pt.user_id = p.id
      ), 0)
    ),
    updated_at = now();

create or replace function public.get_my_rewards_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
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
  claimed_rewards as (
    select
      r.id,
      r.campaign_id,
      c.name as campaign_name,
      c.type::text as campaign_type,
      r.reward_name,
      coalesce(r.reward_code, '') as reward_code,
      coalesce(p.points_awarded, 0) as points,
      r.claimed_at
    from public.reward_claims r
    join public.campaigns c on c.id = r.campaign_id
    left join public.participations p on p.id = r.participation_id
    where r.user_id = auth.uid()
  ),
  qr_wins_without_claim as (
    select
      p.id,
      p.campaign_id,
      c.name as campaign_name,
      c.type::text as campaign_type,
      coalesce(q.reward_name, 'Premio') as reward_name,
      coalesce(q.reward_code, '') as reward_code,
      coalesce(p.points_awarded, 0) as points,
      coalesce(p.completed_at, p.started_at) as claimed_at
    from public.participations p
    join public.campaigns c on c.id = p.campaign_id
    join public.qr_codes q on q.id = p.qr_code_id and q.is_winner = true
    where p.user_id = auth.uid()
      and p.status = 'completed'
      and not exists (
        select 1
        from public.reward_claims r
        where r.user_id = p.user_id
          and r.participation_id = p.id
      )
  ),
  all_rewards as (
    select * from claimed_rewards
    union all
    select * from qr_wins_without_claim
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
            'claimedAt', claimed_at
          ) order by claimed_at desc
        ),
        '[]'::jsonb
      ) as items
    from all_rewards
  )
  select jsonb_build_object(
    'points', coalesce((select points from my_points), 0),
    'captures', coalesce((select captures from capture_totals), 0),
    'prizes', coalesce((select prizes from reward_summary), 0),
    'items', coalesce((select items from reward_summary), '[]'::jsonb)
  );
$$;

grant execute on function public.get_my_rewards_dashboard() to authenticated;
