-- Home Run Rewards | vigencia de premios y cierre de flujo QR
-- Archivo: 384_vigencia_premios_y_qr.sql
-- Ejecutar después de: 383_reparacion_guardado_recompensas.sql
-- Idempotente.

begin;

-- 1) Vigencia configurable por campaña.
alter table public.campaigns
  add column if not exists reward_validity_days integer not null default 15;

update public.campaigns
set reward_validity_days = 15
where reward_validity_days is null or reward_validity_days < 1;

alter table public.campaigns
  drop constraint if exists campaigns_reward_validity_days_check;
alter table public.campaigns
  add constraint campaigns_reward_validity_days_check
  check (reward_validity_days between 1 and 3650);

-- 2) Escaneo QR: puntos, mensaje de suerte/premio y expiración del premio ganador.
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
  v_claim uuid;
  v_points integer := 0;
  v_reward text;
  v_reward_code text;
  v_demo boolean := false;
  v_expires_at timestamptz;
  v_days integer := 15;
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
    and token_hash = encode(extensions.digest(trim(p_token)::text, 'sha256'::text), 'hex')
    and is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid', 'message', 'El QR no es válido para esta campaña.');
  end if;

  if exists (
    select 1 from public.participations
    where user_id = v_user
      and campaign_id = p_campaign_id
      and qr_code_id = v_code.id
  ) then
    return jsonb_build_object('ok', false, 'status', 'duplicate', 'message', 'Ya escaneaste este código. Sigue buscando otro QR.');
  end if;

  select count(*) into v_count
  from public.participations
  where user_id = v_user
    and campaign_id = p_campaign_id
    and qr_code_id is not null;

  if v_count >= greatest(1, coalesce(v_campaign.participation_limit, 1)) then
    return jsonb_build_object('ok', false, 'status', 'limit_reached', 'message', 'Ya alcanzaste el límite de intentos de esta campaña.');
  end if;

  v_demo := public.demo_simulation_enabled();
  v_points := case when v_demo then 0 else coalesce(v_code.points, 0) end;
  v_reward := case when v_code.is_winner then coalesce(nullif(v_code.reward_name,''), 'Premio') else null end;
  v_reward_code := case when v_code.is_winner then v_code.reward_code else null end;
  v_days := greatest(1, coalesce(v_campaign.reward_validity_days, 15));
  v_expires_at := now() + make_interval(days => v_days);

  insert into public.participations(
    campaign_id, user_id, qr_code_id, status, points_awarded, completed_at, metadata
  ) values (
    p_campaign_id,
    v_user,
    v_code.id,
    'completed',
    v_points,
    now(),
    jsonb_build_object('display_code', v_code.display_code, 'winner', v_code.is_winner, 'demo', v_demo)
  ) returning id into v_participation;

  update public.qr_codes
  set total_uses = coalesce(total_uses, 0) + 1
  where id = v_code.id;

  if v_points <> 0 then
    insert into public.point_transactions(
      user_id, campaign_id, participation_id, points, transaction_type, description
    ) values (
      v_user, p_campaign_id, v_participation, v_points, 'qr_scan', 'Escaneo ' || v_code.display_code
    );
  end if;

  if v_code.is_winner then
    insert into public.reward_claims(
      user_id, campaign_id, participation_id, reward_name, reward_code, status, claimed_at, expires_at
    ) values (
      v_user, p_campaign_id, v_participation, v_reward, v_reward_code, 'active', now(), v_expires_at
    ) returning id into v_claim;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', case when v_code.is_winner then 'winner' else 'not_winner' end,
    'message', case
      when v_code.is_winner then '¡Felicidades! Has ganado ' || v_reward || '. Tu premio estará disponible durante ' || v_days || ' días.'
      else '¡Mejor suerte a la siguiente! Sigue buscando.'
    end,
    'pointsAwarded', v_points,
    'demo', v_demo,
    'rewardValidityDays', v_days,
    'expiresAt', case when v_code.is_winner then v_expires_at else null end,
    'claimId', v_claim,
    'code', jsonb_build_object(
      'id', v_code.id,
      'label', v_code.display_code,
      'isWinner', v_code.is_winner,
      'reward', coalesce(v_reward, ''),
      'rewardCode', coalesce(v_reward_code, ''),
      'points', v_points
    )
  );
exception when others then
  return jsonb_build_object('ok', false, 'status', 'invalid', 'message', 'No fue posible registrar el QR: ' || SQLERRM);
end;
$$;

alter function public.scan_qr(uuid,text) owner to postgres;
revoke all on function public.scan_qr(uuid,text) from public;
grant execute on function public.scan_qr(uuid,text) to authenticated, service_role;

-- 3) Recompensas de mapa/visita a marca con fecha de expiración.
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
  v_claim uuid;
  v_points integer := 0;
  v_reward text;
  v_code text;
  v_demo boolean := false;
  v_warning text := null;
  v_days integer := 15;
  v_expires_at timestamptz;
begin
  if v_user is null then
    return jsonb_build_object('ok',false,'status','error','message','No autenticado.');
  end if;

  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id and type in ('map','brand');
  if not found then return jsonb_build_object('ok',false,'status','error','message','Campaña no encontrada.'); end if;
  if v_campaign.status <> 'active' then return jsonb_build_object('ok',false,'status','error','message','La campaña no está activa.'); end if;

  if p_location_id is not null then
    select * into v_location
    from public.campaign_locations
    where id = p_location_id and campaign_id = p_campaign_id and is_active;
    if not found then return jsonb_build_object('ok',false,'status','error','message','Ubicación no encontrada o inactiva.'); end if;
  end if;

  select max(cooldown_until) into v_last
  from public.participations
  where user_id = v_user and campaign_id = p_campaign_id
    and (p_location_id is null or location_id = p_location_id)
    and cooldown_until is not null;

  if v_last is not null and v_last > now() then
    return jsonb_build_object('ok', false, 'status', 'blocked', 'cooldownUntil', v_last, 'message', 'Debes esperar para volver a participar.');
  end if;

  v_demo := public.demo_simulation_enabled();
  v_points := case
    when v_demo then 0
    when p_success and p_location_id is not null then coalesce(v_location.points, v_campaign.points_on_success, 0)
    when p_success then coalesce(v_campaign.points_on_success, 0)
    else coalesce(v_campaign.points_on_failure, 0)
  end;
  v_reward := case
    when not p_success then null
    when p_location_id is not null then coalesce(nullif(v_location.reward_name,''), v_campaign.metadata->>'reward', v_campaign.name)
    else coalesce(v_campaign.metadata->>'reward', v_campaign.name)
  end;
  v_code := case
    when not p_success then null
    when p_location_id is not null then coalesce(nullif(v_location.reward_code,''), v_campaign.metadata->>'rewardCode')
    else v_campaign.metadata->>'rewardCode'
  end;
  v_days := greatest(1, coalesce(v_campaign.reward_validity_days, 15));
  v_expires_at := now() + make_interval(days => v_days);

  insert into public.participations(
    campaign_id,user_id,location_id,status,score,points_awarded,completed_at,cooldown_until,metadata
  ) values (
    p_campaign_id, v_user, p_location_id,
    case when p_success then 'completed'::public.participation_status else 'failed'::public.participation_status end,
    p_score, v_points, now(),
    case when p_success then null else now() + make_interval(hours => coalesce(v_campaign.cooldown_hours,0)) end,
    coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('demo',v_demo)
  ) returning id into v_participation;

  if p_success and nullif(trim(coalesce(v_reward,'')),'') is not null then
    begin
      insert into public.reward_claims(
        user_id,campaign_id,participation_id,reward_name,reward_code,status,claimed_at,expires_at
      ) values (
        v_user,p_campaign_id,v_participation,v_reward,v_code,'active',now(),v_expires_at
      ) returning id into v_claim;
    exception when others then
      return jsonb_build_object('ok',false,'status','reward_error','message','No se pudo guardar la recompensa: ' || SQLERRM,'participationId',v_participation);
    end;
  end if;

  if p_success and p_location_id is not null and not v_demo and coalesce(v_location.reward_units,0) > 0 then
    update public.campaign_locations set reward_units = greatest(0,reward_units - 1) where id = p_location_id;
  end if;

  if v_points <> 0 then
    begin
      insert into public.point_transactions(user_id,campaign_id,participation_id,points,transaction_type,description)
      values (v_user,p_campaign_id,v_participation,v_points,case when p_success then 'campaign_reward' else 'campaign_failure' end,v_campaign.name);
    exception when others then
      v_warning := 'La recompensa se guardó, pero los puntos no pudieron actualizarse: ' || SQLERRM;
    end;
  end if;

  return jsonb_build_object(
    'ok',true,
    'status',case when p_success then 'completed' else 'failed' end,
    'participationId',v_participation,
    'claimId',v_claim,
    'pointsAwarded',v_points,
    'reward',v_reward,
    'rewardCode',v_code,
    'rewardValidityDays',v_days,
    'expiresAt',case when p_success then v_expires_at else null end,
    'demo',v_demo,
    'warning',v_warning,
    'message',case when p_success then '¡Felicidades! Tu premio estará disponible durante ' || v_days || ' días.' else null end
  );
exception when others then
  return jsonb_build_object('ok',false,'status','error','message','No se pudo completar la dinámica: ' || SQLERRM);
end;
$$;

alter function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) owner to postgres;
revoke all on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) from public;
grant execute on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) to authenticated, service_role;

-- 4) Mis recompensas: solo vigentes y con fecha de obtención/expiración.
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
      r.id, r.campaign_id, c.name as campaign_name, c.type::text as campaign_type,
      r.reward_name, coalesce(r.reward_code, '') as reward_code,
      coalesce(p.points_awarded, 0) as points, r.claimed_at, r.expires_at
    from public.reward_claims r
    join public.campaigns c on c.id = r.campaign_id
    left join public.participations p on p.id = r.participation_id
    where r.user_id = auth.uid()
      and r.status = 'active'
      and (r.expires_at is null or r.expires_at > now())
  ),
  reward_summary as (
    select count(*)::bigint as prizes,
      coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'campaignId', campaign_id,
        'campaignName', campaign_name,
        'campaignType', campaign_type,
        'rewardName', reward_name,
        'rewardCode', reward_code,
        'points', points,
        'claimedAt', claimed_at,
        'expiresAt', expires_at
      ) order by claimed_at desc), '[]'::jsonb) as items
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

notify pgrst, 'reload schema';
commit;

select
  to_regprocedure('public.scan_qr(uuid,text)') as scan_qr,
  to_regprocedure('public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb)') as complete_dynamic_reward,
  to_regprocedure('public.get_my_rewards_dashboard()') as rewards_dashboard;
