-- Home Run Rewards | Demo por usuario, QR sincronizado, premios temporales y mapa robusto
-- Archivo: 387_demo_usuarios_qr_premios_y_mapa.sql
-- Ejecutar después de: 386_qr_edicion_ubicaciones_y_vigencia_recompensas.sql
-- Idempotente.

begin;

-- ---------------------------------------------------------------------------
-- 1. Demo limitado a usuarios seleccionados (máximo 10).
-- ---------------------------------------------------------------------------
create table if not exists public.demo_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.demo_users enable row level security;

drop policy if exists demo_users_admin_read on public.demo_users;
create policy demo_users_admin_read on public.demo_users
for select to authenticated
using (public.is_admin());

drop policy if exists demo_users_admin_write on public.demo_users;
create policy demo_users_admin_write on public.demo_users
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.demo_users to authenticated;

create or replace function public.validate_demo_users_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if new.enabled then
    select count(*) into v_count
    from public.demo_users
    where enabled = true
      and user_id <> new.user_id;
    if v_count >= 10 then
      raise exception 'DEMO_USER_LIMIT: solo se permiten 10 usuarios demo activos.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists demo_users_limit_trigger on public.demo_users;
create trigger demo_users_limit_trigger
before insert or update of enabled on public.demo_users
for each row execute function public.validate_demo_users_limit();

create or replace function public.set_demo_users(p_user_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[] := coalesce(p_user_ids, '{}'::uuid[]);
  v_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select count(distinct x) into v_count from unnest(v_ids) x;
  if v_count > 10 then
    raise exception 'DEMO_USER_LIMIT: máximo 10 usuarios.';
  end if;

  if exists (
    select 1 from unnest(v_ids) x
    left join public.profiles p on p.id = x
    where p.id is null or p.role::text <> 'usuario'
  ) then
    raise exception 'DEMO_USERS_INVALID: selecciona únicamente usuarios válidos.';
  end if;

  delete from public.demo_users;
  insert into public.demo_users(user_id, enabled, created_by)
  select distinct x, true, auth.uid()
  from unnest(v_ids) x;

  return v_count;
end;
$$;

alter function public.set_demo_users(uuid[]) owner to postgres;
revoke all on function public.set_demo_users(uuid[]) from public;
grant execute on function public.set_demo_users(uuid[]) to authenticated, service_role;

create or replace function public.get_my_demo_status()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'enabled', coalesce(
      (select du.enabled from public.demo_users du where du.user_id = auth.uid()),
      false
    )
  );
$$;

alter function public.get_my_demo_status() owner to postgres;
revoke all on function public.get_my_demo_status() from public;
grant execute on function public.get_my_demo_status() to authenticated, service_role;

-- La simulación solo afecta al usuario autenticado si el interruptor global está
-- encendido Y esa cuenta fue seleccionada explícitamente por el administrador.
create or replace function public.demo_simulation_enabled()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and coalesce(
      (
        select case
          when jsonb_typeof(value) = 'object'
            then coalesce((value ->> 'simulatedLocationEnabled')::boolean, false)
          else false
        end
        from public.app_settings
        where key = 'demo'
        limit 1
      ), false
    )
    and exists (
      select 1 from public.demo_users du
      where du.user_id = auth.uid() and du.enabled = true
    );
$$;

alter function public.demo_simulation_enabled() owner to postgres;
revoke all on function public.demo_simulation_enabled() from public;
grant execute on function public.demo_simulation_enabled() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Premios demo identificables y ocultables al desactivar Demo.
-- ---------------------------------------------------------------------------
alter table public.reward_claims
  add column if not exists is_demo boolean not null default false;

create index if not exists reward_claims_user_demo_active_idx
  on public.reward_claims(user_id, is_demo, claimed_at desc);

-- Recupera correctamente los premios demo ya generados por versiones anteriores.
update public.reward_claims r
set is_demo = true
from public.participations p
where p.id = r.participation_id
  and coalesce((p.metadata ->> 'demo')::boolean, false) = true
  and r.is_demo = false;

-- ---------------------------------------------------------------------------
-- 3. Sincronizar QR existentes con la configuración actual de la campaña.
--    Un QR ganador usa el premio de la campaña; todos recuperan sus puntos
--    configurados actuales sin regenerar tokens ni cambiar qué códigos ganan.
-- ---------------------------------------------------------------------------
update public.qr_codes q
set reward_name = coalesce(nullif(c.metadata ->> 'reward', ''), q.reward_name, 'Premio'),
    points = coalesce(c.points_on_success, q.points, 0)
from public.campaigns c
where c.id = q.campaign_id
  and c.type = 'qr'
  and q.is_winner = true;

update public.qr_codes q
set reward_name = null,
    points = coalesce(c.points_on_failure, q.points, 0)
from public.campaigns c
where c.id = q.campaign_id
  and c.type = 'qr'
  and q.is_winner = false;

-- ---------------------------------------------------------------------------
-- 4. Escaneo QR autoritativo: puntos para ganador y no ganador, premio correcto
--    y registro demo temporal cuando corresponda.
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
    where user_id = v_user and campaign_id = p_campaign_id and qr_code_id = v_code.id
  ) then
    return jsonb_build_object('ok', false, 'status', 'duplicate', 'message', 'Ya escaneaste este código. Sigue buscando otro QR.');
  end if;

  select count(*) into v_count
  from public.participations
  where user_id = v_user and campaign_id = p_campaign_id and qr_code_id is not null;

  if v_count >= greatest(1, coalesce(v_campaign.participation_limit, 1)) then
    return jsonb_build_object('ok', false, 'status', 'limit_reached', 'message', 'Ya alcanzaste el límite de intentos de esta campaña.');
  end if;

  v_demo := public.demo_simulation_enabled();
  v_points := case
    when v_demo then 0
    when v_code.is_winner then coalesce(v_campaign.points_on_success, v_code.points, 0)
    else coalesce(v_campaign.points_on_failure, v_code.points, 0)
  end;
  v_reward := case when v_code.is_winner
    then coalesce(nullif(v_campaign.metadata ->> 'reward', ''), nullif(v_code.reward_name, ''), 'Premio')
    else null end;
  v_reward_code := case when v_code.is_winner then v_code.reward_code else null end;
  v_days := greatest(1, coalesce(v_campaign.reward_validity_days, 15));
  v_expires_at := now() + make_interval(days => v_days);

  insert into public.participations(
    campaign_id, user_id, qr_code_id, status, points_awarded, completed_at, metadata
  ) values (
    p_campaign_id, v_user, v_code.id, 'completed', v_points, now(),
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
      user_id, campaign_id, participation_id, reward_name, reward_code,
      status, claimed_at, expires_at, is_demo
    ) values (
      v_user, p_campaign_id, v_participation, v_reward, v_reward_code,
      'active', now(), v_expires_at, v_demo
    ) returning id into v_claim;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', case when v_code.is_winner then 'winner' else 'not_winner' end,
    'message', case
      when v_code.is_winner then '¡Felicidades! Has ganado ' || v_reward || '. Tu premio estará disponible durante ' || v_days || ' días.'
      else '¡Mejor suerte a la siguiente! Sigue buscando. Ganaste ' || v_points || ' puntos por participar.'
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

-- ---------------------------------------------------------------------------
-- 5. Dinámicas mapa/marca: premio Demo visible mientras Demo esté activo,
--    sin consumir inventario ni puntos reales.
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
  v_claim uuid;
  v_points integer := 0;
  v_reward text;
  v_code text;
  v_demo boolean := false;
  v_warning text := null;
  v_days integer := 15;
  v_expires_at timestamptz;
begin
  if v_user is null then return jsonb_build_object('ok',false,'status','error','message','No autenticado.'); end if;

  select * into v_campaign from public.campaigns where id=p_campaign_id and type in ('map','brand');
  if not found then return jsonb_build_object('ok',false,'status','error','message','Campaña no encontrada.'); end if;
  if v_campaign.status <> 'active' then return jsonb_build_object('ok',false,'status','error','message','La campaña no está activa.'); end if;

  if p_location_id is not null then
    select * into v_location from public.campaign_locations
    where id=p_location_id and campaign_id=p_campaign_id and is_active;
    if not found then return jsonb_build_object('ok',false,'status','error','message','Ubicación no encontrada o inactiva.'); end if;
  end if;

  select max(cooldown_until) into v_last from public.participations
  where user_id=v_user and campaign_id=p_campaign_id
    and (p_location_id is null or location_id=p_location_id) and cooldown_until is not null;
  if v_last is not null and v_last > now() then
    return jsonb_build_object('ok',false,'status','blocked','cooldownUntil',v_last,'message','Debes esperar para volver a participar.');
  end if;

  v_demo := public.demo_simulation_enabled();
  v_points := case
    when v_demo then 0
    when p_success and p_location_id is not null then coalesce(v_location.points,v_campaign.points_on_success,0)
    when p_success then coalesce(v_campaign.points_on_success,0)
    else coalesce(v_campaign.points_on_failure,0)
  end;
  v_reward := case when not p_success then null when p_location_id is not null then coalesce(nullif(v_location.reward_name,''),v_campaign.metadata->>'reward',v_campaign.name) else coalesce(v_campaign.metadata->>'reward',v_campaign.name) end;
  v_code := case when not p_success then null when p_location_id is not null then coalesce(nullif(v_location.reward_code,''),v_campaign.metadata->>'rewardCode') else v_campaign.metadata->>'rewardCode' end;
  v_days := greatest(1,coalesce(v_campaign.reward_validity_days,15));
  v_expires_at := now()+make_interval(days=>v_days);

  insert into public.participations(campaign_id,user_id,location_id,status,score,points_awarded,completed_at,cooldown_until,metadata)
  values(p_campaign_id,v_user,p_location_id,case when p_success then 'completed'::public.participation_status else 'failed'::public.participation_status end,p_score,v_points,now(),case when p_success then null else now()+make_interval(hours=>coalesce(v_campaign.cooldown_hours,0)) end,coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('demo',v_demo))
  returning id into v_participation;

  if p_success and nullif(trim(coalesce(v_reward,'')),'') is not null then
    begin
      insert into public.reward_claims(user_id,campaign_id,participation_id,reward_name,reward_code,status,claimed_at,expires_at,is_demo)
      values(v_user,p_campaign_id,v_participation,v_reward,v_code,'active',now(),v_expires_at,v_demo)
      returning id into v_claim;
    exception when others then
      return jsonb_build_object('ok',false,'status','reward_error','message','No se pudo guardar la recompensa: '||SQLERRM,'participationId',v_participation);
    end;
  end if;

  if p_success and p_location_id is not null and not v_demo and coalesce(v_location.reward_units,0)>0 then
    update public.campaign_locations set reward_units=greatest(0,reward_units-1) where id=p_location_id;
  end if;

  if v_points<>0 then
    begin
      insert into public.point_transactions(user_id,campaign_id,participation_id,points,transaction_type,description)
      values(v_user,p_campaign_id,v_participation,v_points,case when p_success then 'campaign_reward' else 'campaign_failure' end,v_campaign.name);
    exception when others then v_warning:='La recompensa se guardó, pero los puntos no pudieron actualizarse: '||SQLERRM; end;
  end if;

  return jsonb_build_object('ok',true,'status',case when p_success then 'completed' else 'failed' end,'participationId',v_participation,'claimId',v_claim,'pointsAwarded',v_points,'reward',v_reward,'rewardCode',v_code,'rewardValidityDays',v_days,'expiresAt',case when p_success then v_expires_at else null end,'demo',v_demo,'warning',v_warning,'message',case when p_success then '¡Felicidades! Tu premio estará disponible durante '||v_days||' días.' else null end);
exception when others then
  return jsonb_build_object('ok',false,'status','error','message','No se pudo completar la dinámica: '||SQLERRM);
end;
$$;

alter function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) owner to postgres;
revoke all on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) from public;
grant execute on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Mis recompensas: premios Demo visibles solo mientras ese usuario tenga
--    Demo efectivo; al desactivarlo desaparecen sin contaminar premios reales.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_rewards_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with my_points as (
    select coalesce(sum(pt.points),0)::bigint as points from public.point_transactions pt where pt.user_id=auth.uid()
  ),
  capture_totals as (
    select count(*)::bigint as captures from public.participations p
    where p.user_id=auth.uid() and p.status='completed'
      and (coalesce((p.metadata->>'demo')::boolean,false)=false or public.demo_simulation_enabled())
  ),
  normalized_rewards as (
    select r.id,r.campaign_id,c.name as campaign_name,c.type::text as campaign_type,r.reward_name,
      coalesce(r.reward_code,'') as reward_code,coalesce(p.points_awarded,0) as points,r.claimed_at,
      coalesce(r.expires_at,r.claimed_at+make_interval(days=>greatest(1,coalesce(c.reward_validity_days,15)))) as effective_expires_at,
      lower(coalesce(r.status,'active')) as reward_status,r.is_demo
    from public.reward_claims r
    join public.campaigns c on c.id=r.campaign_id
    left join public.participations p on p.id=r.participation_id
    where r.user_id=auth.uid()
  ),
  valid_rewards as (
    select * from normalized_rewards
    where reward_status in ('active','claimed','reserved')
      and effective_expires_at>now()
      and (is_demo=false or public.demo_simulation_enabled())
  ),
  reward_summary as (
    select count(*)::bigint as prizes,
      coalesce(jsonb_agg(jsonb_build_object(
        'id',id,'campaignId',campaign_id,'campaignName',campaign_name,'campaignType',campaign_type,
        'rewardName',reward_name,'rewardCode',reward_code,'points',points,'claimedAt',claimed_at,
        'expiresAt',effective_expires_at,'demo',is_demo
      ) order by claimed_at desc),'[]'::jsonb) as items
    from valid_rewards
  )
  select jsonb_build_object(
    'points',coalesce((select points from my_points),0),
    'captures',coalesce((select captures from capture_totals),0),
    'prizes',coalesce((select prizes from reward_summary),0),
    'items',coalesce((select items from reward_summary),'[]'::jsonb)
  );
$$;

alter function public.get_my_rewards_dashboard() owner to postgres;
revoke all on function public.get_my_rewards_dashboard() from public;
grant execute on function public.get_my_rewards_dashboard() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Limpiar progreso Demo. Si lo ejecuta un admin, limpia las cuentas
--    seleccionadas; si lo ejecuta un usuario, solo su cuenta.
-- ---------------------------------------------------------------------------
create or replace function public.reset_demo_progress()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_targets uuid[];
begin
  if v_user is null then raise exception 'Debes iniciar sesión'; end if;

  if public.is_admin() then
    select coalesce(array_agg(user_id), '{}'::uuid[]) into v_targets
    from public.demo_users where enabled=true;
  else
    v_targets := array[v_user];
  end if;

  delete from public.ticket_images where submission_id in (select id from public.ticket_submissions where user_id=any(v_targets));
  delete from public.ticket_submissions where user_id=any(v_targets);
  delete from public.reward_claims where user_id=any(v_targets) and is_demo=true;
  delete from public.point_transactions pt where pt.user_id=any(v_targets)
    and exists(select 1 from public.participations p where p.id=pt.participation_id and coalesce((p.metadata->>'demo')::boolean,false));
  delete from public.participations where user_id=any(v_targets) and coalesce((metadata->>'demo')::boolean,false);

  update public.qr_codes q set total_uses=(select count(*)::integer from public.participations p where p.qr_code_id=q.id);
end;
$$;

alter function public.reset_demo_progress() owner to postgres;
revoke all on function public.reset_demo_progress() from public;
grant execute on function public.reset_demo_progress() to authenticated, service_role;

notify pgrst, 'reload schema';
commit;

-- Verificación
select to_regclass('public.demo_users') as demo_users,
       to_regprocedure('public.set_demo_users(uuid[])') as set_demo_users,
       to_regprocedure('public.get_my_demo_status()') as demo_status,
       to_regprocedure('public.scan_qr(uuid,text)') as scan_qr;
