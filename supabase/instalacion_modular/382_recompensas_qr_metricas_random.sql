-- Home Run Rewards | recompensas reales, escaneo QR y métricas demo aleatorias
-- Archivo: 382_recompensas_qr_metricas_random.sql
-- Ejecutar después de: 381_ajustes_notificacion_promociones_puntos_demo.sql
-- Idempotente.

begin;

-- ---------------------------------------------------------------------------
-- 1. Los QR físicos pueden ser utilizados por muchos usuarios.
--    La prevención de duplicados sigue siendo por usuario + código.
-- ---------------------------------------------------------------------------
update public.qr_codes
set max_uses = 1000000
where coalesce(max_uses, 0) < 1000000;

-- ---------------------------------------------------------------------------
-- 2. Escaneo QR: registra participación, puntos reales fuera de demo y premio.
-- ---------------------------------------------------------------------------
create or replace function public.scan_qr(
  p_campaign_id uuid,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.campaigns%rowtype;
  v_code public.qr_codes%rowtype;
  v_count integer;
  v_participation uuid;
  v_points integer := 0;
  v_reward text;
  v_reward_code text;
  v_demo boolean := false;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'status', 'unauthorized', 'message', 'Inicia sesión para participar.');
  end if;

  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id and type = 'qr';

  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid', 'message', 'Campaña no encontrada.');
  end if;

  if v_campaign.status <> 'active'
     or (v_campaign.starts_at is not null and now() < v_campaign.starts_at)
     or (v_campaign.ends_at is not null and now() > v_campaign.ends_at) then
    return jsonb_build_object('ok', false, 'status', 'inactive', 'message', 'La campaña no está activa.');
  end if;

  select * into v_code
  from public.qr_codes
  where campaign_id = p_campaign_id
    and token_hash = encode(extensions.digest(p_token::text, 'sha256'::text), 'hex')
    and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid', 'message', 'El QR no es válido para esta campaña.');
  end if;

  if exists (
    select 1 from public.participations
    where user_id = v_user
      and campaign_id = p_campaign_id
      and qr_code_id = v_code.id
  ) then
    return jsonb_build_object('ok', false, 'status', 'duplicate', 'message', 'Ya escaneaste este código. Busca otro para seguir participando.');
  end if;

  select count(*) into v_count
  from public.participations
  where user_id = v_user
    and campaign_id = p_campaign_id
    and qr_code_id is not null;

  if v_count >= greatest(1, coalesce(v_campaign.participation_limit, 1)) then
    return jsonb_build_object('ok', false, 'status', 'limit_reached', 'message', 'Ya alcanzaste el límite de intentos de esta campaña.');
  end if;

  -- El límite global queda alto para que el QR físico sea compartible entre usuarios.
  if coalesce(v_code.total_uses, 0) >= greatest(coalesce(v_code.max_uses, 1000000), 1000000) then
    return jsonb_build_object('ok', false, 'status', 'invalid', 'message', 'Este código ya alcanzó su límite de usos.');
  end if;

  v_demo := public.demo_simulation_enabled();
  v_points := case when v_demo then 0 else coalesce(v_code.points, 0) end;
  v_reward := case when v_code.is_winner then coalesce(v_code.reward_name, 'Premio') else null end;
  v_reward_code := case when v_code.is_winner then v_code.reward_code else null end;

  insert into public.participations(
    campaign_id, user_id, qr_code_id, status, points_awarded, completed_at, metadata
  ) values (
    p_campaign_id,
    v_user,
    v_code.id,
    'completed',
    v_points,
    now(),
    jsonb_build_object(
      'display_code', v_code.display_code,
      'winner', v_code.is_winner,
      'demo', v_demo
    )
  ) returning id into v_participation;

  update public.qr_codes
  set total_uses = coalesce(total_uses, 0) + 1
  where id = v_code.id;

  if v_points <> 0 then
    insert into public.point_transactions(
      user_id, campaign_id, participation_id, points, transaction_type, description
    ) values (
      v_user,
      p_campaign_id,
      v_participation,
      v_points,
      'qr_scan',
      'Escaneo ' || v_code.display_code
    );
  end if;

  -- El premio se guarda al momento del escaneo ganador. En demo se conserva
  -- para demostrar el flujo, pero sin puntos reales.
  if v_code.is_winner then
    insert into public.reward_claims(
      user_id, campaign_id, participation_id, reward_name, reward_code
    ) values (
      v_user, p_campaign_id, v_participation, v_reward, v_reward_code
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', case when v_code.is_winner then 'winner' else 'not_winner' end,
    'message', case
      when v_code.is_winner then '¡Felicidades! Ganaste ' || v_reward || '.'
      else 'QR registrado correctamente. Sigue participando.'
    end,
    'pointsAwarded', v_points,
    'demo', v_demo,
    'code', jsonb_build_object(
      'id', v_code.id,
      'label', v_code.display_code,
      'isWinner', v_code.is_winner,
      'reward', coalesce(v_reward, ''),
      'rewardCode', coalesce(v_reward_code, ''),
      'points', v_points
    )
  );
end;
$$;

alter function public.scan_qr(uuid,text) owner to postgres;
revoke all on function public.scan_qr(uuid,text) from public;
grant execute on function public.scan_qr(uuid,text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Mapa / visita a marca: guarda el premio de inmediato y suma puntos
--    únicamente cuando el modo demo está apagado.
-- ---------------------------------------------------------------------------
create or replace function public.complete_dynamic_reward(
  p_campaign_id uuid,
  p_location_id uuid default null,
  p_score numeric default 100,
  p_success boolean default true,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.campaigns%rowtype;
  v_location public.campaign_locations%rowtype;
  v_last timestamptz;
  v_participation uuid;
  v_points integer := 0;
  v_reward text;
  v_code text;
  v_demo boolean := false;
begin
  if v_user is null then raise exception 'No autenticado'; end if;

  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id and type in ('map','brand');
  if not found then raise exception 'Campaña no encontrada'; end if;
  if v_campaign.status <> 'active' then raise exception 'Campaña inactiva'; end if;

  if p_location_id is not null then
    select * into v_location
    from public.campaign_locations
    where id = p_location_id and campaign_id = p_campaign_id and is_active;
    if not found then raise exception 'Ubicación no encontrada'; end if;
  end if;

  select max(cooldown_until) into v_last
  from public.participations
  where user_id = v_user
    and campaign_id = p_campaign_id
    and (p_location_id is null or location_id = p_location_id)
    and cooldown_until is not null;

  if v_last is not null and v_last > now() then
    return jsonb_build_object('ok', false, 'status', 'blocked', 'cooldownUntil', v_last, 'message', 'Debes esperar para volver a participar.');
  end if;

  v_demo := public.demo_simulation_enabled();
  v_points := case
    when v_demo then 0
    when p_success then coalesce(v_location.points, v_campaign.points_on_success, 0)
    else coalesce(v_campaign.points_on_failure, 0)
  end;
  v_reward := case when p_success then coalesce(v_location.reward_name, v_campaign.metadata->>'reward', v_campaign.name) else null end;
  v_code := case when p_success then coalesce(v_location.reward_code, v_campaign.metadata->>'rewardCode') else null end;

  insert into public.participations(
    campaign_id, user_id, location_id, status, score, points_awarded, completed_at, cooldown_until, metadata
  ) values (
    p_campaign_id,
    v_user,
    p_location_id,
    case when p_success then 'completed' else 'failed' end,
    p_score,
    v_points,
    now(),
    case when p_success then null else now() + make_interval(hours => v_campaign.cooldown_hours) end,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('demo', v_demo)
  ) returning id into v_participation;

  if p_success and p_location_id is not null and coalesce(v_location.reward_units, 0) > 0 and not v_demo then
    update public.campaign_locations
    set reward_units = greatest(0, reward_units - 1)
    where id = p_location_id;
  end if;

  if v_points <> 0 then
    insert into public.point_transactions(
      user_id, campaign_id, participation_id, points, transaction_type, description
    ) values (
      v_user,
      p_campaign_id,
      v_participation,
      v_points,
      case when p_success then 'campaign_reward' else 'campaign_failure' end,
      v_campaign.name
    );
  end if;

  if p_success and v_reward is not null then
    insert into public.reward_claims(
      user_id, campaign_id, participation_id, reward_name, reward_code
    ) values (
      v_user, p_campaign_id, v_participation, v_reward, v_code
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', case when p_success then 'completed' else 'failed' end,
    'participationId', v_participation,
    'pointsAwarded', v_points,
    'reward', v_reward,
    'rewardCode', v_code,
    'demo', v_demo
  );
end;
$$;

alter function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) owner to postgres;
revoke all on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) from public;
grant execute on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Dashboard de recompensas consolidado.
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
    where p.user_id = auth.uid() and p.status = 'completed'
  ),
  all_rewards as (
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

alter function public.get_my_rewards_dashboard() owner to postgres;
revoke all on function public.get_my_rewards_dashboard() from public;
grant execute on function public.get_my_rewards_dashboard() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Cada click de "Simular métricas" genera una corrida NUEVA y aleatoria.
--    Los valores guardan coherencia entre sí y siguen aislados de datos reales.
-- ---------------------------------------------------------------------------
create or replace function public.simular_metricas_campana(p_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_rows integer := 0;
  v_day date;
  v_uploads integer;
  v_valid integer;
  v_rejected integer;
  v_participants integer;
  v_rewards integer;
  v_redeemed integer;
  v_sales numeric(14,2);
  v_points bigint;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select coalesce((value->>'simulatedLocationEnabled')::boolean, false)
    into v_enabled
  from public.app_settings
  where key = 'demo';

  if not v_enabled then raise exception 'DEMO_LOCATION_REQUIRED'; end if;
  if not exists(select 1 from public.campaigns where id = p_campaign_id) then raise exception 'CAMPAIGN_NOT_FOUND'; end if;

  delete from public.campaign_metrics_demo_daily where campaign_id = p_campaign_id;

  for v_day in
    select d::date
    from generate_series(current_date - interval '29 days', current_date, interval '1 day') d
  loop
    v_uploads := 40 + floor(random() * 101)::int;
    v_valid := greatest(1, least(v_uploads, floor(v_uploads * (0.68 + random() * 0.25))::int));
    v_rejected := greatest(0, v_uploads - v_valid);
    v_participants := greatest(1, least(v_valid, floor(v_valid * (0.72 + random() * 0.25))::int));
    v_rewards := greatest(0, least(v_participants, floor(v_participants * (0.08 + random() * 0.20))::int));
    v_redeemed := greatest(0, least(v_rewards, floor(v_rewards * (0.55 + random() * 0.40))::int));
    v_sales := round((v_valid * (160 + random() * 260))::numeric, 2);
    v_points := (v_participants * (5 + floor(random() * 21)::int))::bigint;

    insert into public.campaign_metrics_demo_daily(
      campaign_id, metric_date, ticket_uploads, valid_tickets, rejected_tickets,
      unique_participants, attributed_sales, rewards_won, rewards_redeemed,
      points_awarded, updated_at
    ) values (
      p_campaign_id, v_day, v_uploads, v_valid, v_rejected,
      v_participants, v_sales, v_rewards, v_redeemed,
      v_points, now()
    );
    v_rows := v_rows + 1;
  end loop;

  return v_rows;
end;
$$;

alter function public.simular_metricas_campana(uuid) owner to postgres;
revoke all on function public.simular_metricas_campana(uuid) from public;
grant execute on function public.simular_metricas_campana(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
commit;

-- Verificación rápida.
select
  to_regprocedure('public.scan_qr(uuid,text)') as scan_qr,
  to_regprocedure('public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb)') as dinamica,
  to_regprocedure('public.simular_metricas_campana(uuid)') as metricas_demo;
