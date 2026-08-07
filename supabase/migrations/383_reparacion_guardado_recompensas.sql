-- Home Run Rewards | reparación robusta de guardado de recompensas
-- Archivo: 383_reparacion_guardado_recompensas.sql
-- Ejecutar después de: 382_recompensas_qr_metricas_random.sql
-- Idempotente.

begin;

-- Asegura columnas funcionales del tablero de recompensas.
alter table public.reward_claims add column if not exists status text not null default 'active';
alter table public.reward_claims add column if not exists expires_at timestamptz;
alter table public.reward_claims add column if not exists claimed_at timestamptz not null default now();
alter table public.reward_claims add column if not exists redeemed_at timestamptz;

create index if not exists reward_claims_user_claimed_idx
  on public.reward_claims(user_id, claimed_at desc);

alter table public.reward_claims enable row level security;
drop policy if exists claims_self on public.reward_claims;
create policy claims_self
on public.reward_claims
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

grant select on public.reward_claims to authenticated;

-- RPC autoritativa. El premio se guarda primero; un fallo secundario de puntos
-- no debe hacer perder una recompensa que el usuario ya ganó.
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
begin
  if v_user is null then
    return jsonb_build_object('ok',false,'status','error','message','No autenticado.');
  end if;

  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id
    and type in ('map','brand');

  if not found then
    return jsonb_build_object('ok',false,'status','error','message','Campaña no encontrada.');
  end if;

  if v_campaign.status <> 'active' then
    return jsonb_build_object('ok',false,'status','error','message','La campaña no está activa.');
  end if;

  if p_location_id is not null then
    select * into v_location
    from public.campaign_locations
    where id = p_location_id
      and campaign_id = p_campaign_id
      and is_active;

    if not found then
      return jsonb_build_object('ok',false,'status','error','message','Ubicación no encontrada o inactiva.');
    end if;
  end if;

  select max(cooldown_until) into v_last
  from public.participations
  where user_id = v_user
    and campaign_id = p_campaign_id
    and (p_location_id is null or location_id = p_location_id)
    and cooldown_until is not null;

  if v_last is not null and v_last > now() then
    return jsonb_build_object(
      'ok', false,
      'status', 'blocked',
      'cooldownUntil', v_last,
      'message', 'Debes esperar para volver a participar.'
    );
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

  insert into public.participations(
    campaign_id,user_id,location_id,status,score,points_awarded,completed_at,cooldown_until,metadata
  ) values (
    p_campaign_id,
    v_user,
    p_location_id,
    case when p_success then 'completed'::public.participation_status else 'failed'::public.participation_status end,
    p_score,
    v_points,
    now(),
    case when p_success then null else now() + make_interval(hours => coalesce(v_campaign.cooldown_hours,0)) end,
    coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('demo',v_demo)
  ) returning id into v_participation;

  -- Guardar la recompensa es la operación principal.
  if p_success and nullif(trim(coalesce(v_reward,'')),'') is not null then
    begin
      insert into public.reward_claims(
        user_id,campaign_id,participation_id,reward_name,reward_code,status,claimed_at
      ) values (
        v_user,p_campaign_id,v_participation,v_reward,v_code,'active',now()
      ) returning id into v_claim;
    exception when others then
      return jsonb_build_object(
        'ok',false,
        'status','reward_error',
        'message','No se pudo guardar la recompensa: ' || SQLERRM,
        'participationId',v_participation
      );
    end;
  end if;

  -- Inventario solo en operación real.
  if p_success and p_location_id is not null and not v_demo and coalesce(v_location.reward_units,0) > 0 then
    update public.campaign_locations
    set reward_units = greatest(0,reward_units - 1)
    where id = p_location_id;
  end if;

  -- Los puntos son secundarios: si algo heredado falla, el premio no se pierde.
  if v_points <> 0 then
    begin
      insert into public.point_transactions(
        user_id,campaign_id,participation_id,points,transaction_type,description
      ) values (
        v_user,p_campaign_id,v_participation,v_points,
        case when p_success then 'campaign_reward' else 'campaign_failure' end,
        v_campaign.name
      );
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
    'demo',v_demo,
    'warning',v_warning
  );
exception when others then
  return jsonb_build_object(
    'ok',false,
    'status','error',
    'message','No se pudo completar la dinámica: ' || SQLERRM
  );
end;
$$;

alter function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) owner to postgres;
revoke all on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) from public;
grant execute on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
commit;

select to_regprocedure('public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb)') as rpc_recompensa;
