-- Home Run Rewards | cierre automático por inventario y edición sin duplicados
-- Archivo: 385_cierre_campanas_inventario_y_edicion.sql
-- Ejecutar después de: 384_vigencia_premios_y_qr.sql
-- Idempotente.

begin;

-- 1) Motivo de finalización para distinguir cierre automático de cierre manual.
alter table public.campaigns add column if not exists finished_reason text;

-- 2) Recalcula el estado de campañas con inventario por ubicación.
create or replace function public.recalculate_campaign_inventory_status(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type text;
  v_status text;
  v_reason text;
  v_units integer := 0;
begin
  select type::text, status::text, finished_reason
  into v_type, v_status, v_reason
  from public.campaigns
  where id = p_campaign_id;

  if not found or v_type not in ('map','brand') then return; end if;

  select coalesce(sum(greatest(reward_units,0)),0)::integer
  into v_units
  from public.campaign_locations
  where campaign_id = p_campaign_id and is_active;

  if v_units <= 0 and v_status = 'active' then
    update public.campaigns
    set status = 'finished'::public.campaign_status,
        finished_reason = 'inventory_exhausted',
        updated_at = now()
    where id = p_campaign_id;
  elsif v_units > 0 and v_status = 'finished' and v_reason = 'inventory_exhausted' then
    update public.campaigns
    set status = 'active'::public.campaign_status,
        finished_reason = null,
        updated_at = now()
    where id = p_campaign_id;
  end if;
end;
$$;

alter function public.recalculate_campaign_inventory_status(uuid) owner to postgres;
revoke all on function public.recalculate_campaign_inventory_status(uuid) from public;
grant execute on function public.recalculate_campaign_inventory_status(uuid) to authenticated, service_role;

-- 3) El inventario gobierna automáticamente el estado después de cualquier cambio.
create or replace function public.trg_recalculate_campaign_inventory_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_campaign_inventory_status(old.campaign_id);
    return old;
  else
    perform public.recalculate_campaign_inventory_status(new.campaign_id);
    return new;
  end if;
end;
$$;

drop trigger if exists campaign_locations_inventory_status on public.campaign_locations;
create trigger campaign_locations_inventory_status
after insert or update or delete
on public.campaign_locations
for each row execute function public.trg_recalculate_campaign_inventory_status();

-- 4) Limpia duplicados históricos creados por ediciones anteriores.
-- Evitamos tablas temporales porque el SQL Editor/API de Supabase puede
-- ejecutar fragmentos en contextos distintos y perder una temp table.
-- Se procesa cada duplicado en un solo bloque PL/pgSQL.
do $$
declare
  r record;
  v_keep_units integer;
  v_dup_units integer;
begin
  for r in
    with ranked as (
      select
        id,
        campaign_id,
        first_value(id) over (
          partition by campaign_id, lower(trim(name)), round(latitude::numeric,6), round(longitude::numeric,6)
          order by created_at, id
        ) as keep_id,
        row_number() over (
          partition by campaign_id, lower(trim(name)), round(latitude::numeric,6), round(longitude::numeric,6)
          order by created_at, id
        ) as rn
      from public.campaign_locations
    )
    select id as duplicate_id, keep_id, campaign_id
    from ranked
    where rn > 1
    order by campaign_id, duplicate_id
  loop
    -- Mover participaciones de la copia a la ubicación que conservaremos.
    update public.participations
    set location_id = r.keep_id
    where location_id = r.duplicate_id;

    -- Conservar el inventario mayor entre ambas filas.
    select coalesce(reward_units,0) into v_keep_units
    from public.campaign_locations
    where id = r.keep_id;

    select coalesce(reward_units,0) into v_dup_units
    from public.campaign_locations
    where id = r.duplicate_id;

    update public.campaign_locations
    set reward_units = greatest(coalesce(v_keep_units,0), coalesce(v_dup_units,0))
    where id = r.keep_id;

    delete from public.campaign_locations
    where id = r.duplicate_id;
  end loop;
end $$;

-- 5) Corrige campañas activas cuyo inventario ya estaba agotado.
do $$
declare r record;
begin
  for r in select id from public.campaigns where type in ('map','brand') loop
    perform public.recalculate_campaign_inventory_status(r.id);
  end loop;
end $$;

-- 6) Refuerza unicidad lógica para que una edición no replique la misma ubicación exacta.
create unique index if not exists campaign_locations_unique_physical_location_idx
on public.campaign_locations (campaign_id, lower(trim(name)), round(latitude::numeric,6), round(longitude::numeric,6));

-- 7) Completar dinámica: descuenta stock, bloquea inventario agotado y finaliza campaña.
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
  v_remaining_units integer := 0;
  v_campaign_finished boolean := false;
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

  if p_success and p_location_id is not null and not v_demo and coalesce(v_location.reward_units,0) <= 0 then
    perform public.recalculate_campaign_inventory_status(p_campaign_id);
    return jsonb_build_object('ok',false,'status','sold_out','message','Los premios de esta ubicación se agotaron.');
  end if;

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
    update public.campaign_locations
    set reward_units = greatest(0,reward_units - 1)
    where id = p_location_id
      and reward_units > 0;

    perform public.recalculate_campaign_inventory_status(p_campaign_id);
    select coalesce(sum(greatest(reward_units,0)),0)::integer into v_remaining_units
    from public.campaign_locations
    where campaign_id = p_campaign_id and is_active;
    v_campaign_finished := v_remaining_units <= 0;
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
    'remainingUnits',v_remaining_units,
    'campaignFinished',v_campaign_finished,
    'message',case when p_success then '¡Felicidades! Tu premio estará disponible durante ' || v_days || ' días.' else null end
  );
exception when others then
  return jsonb_build_object('ok',false,'status','error','message','No se pudo completar la dinámica: ' || SQLERRM);
end;
$$;

alter function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) owner to postgres;
revoke all on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) from public;
grant execute on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) to authenticated, service_role;


notify pgrst, 'reload schema';
commit;

-- Verificación
select id,name,type,status,finished_reason
from public.campaigns
where type in ('map','brand')
order by created_at desc;
