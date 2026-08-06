-- Home Run Rewards | alta correcta de patrocinadores y portal limitado
-- Archivo: 330_roles_patrocinador_y_portal_corregida.sql
-- Ejecutar después de: 320_reparacion_patrocinadores_y_carrusel.sql
-- Migración idempotente: puede ejecutarse nuevamente sin duplicar objetos.
--
-- Corrige:
-- 1. Permite que SQL Editor, service_role y administradores cambien roles.
-- 2. Impide que un usuario normal se autoasigne admin o sponsor.
-- 3. Sincroniza el rol enviado en la invitación de Auth hacia profiles.
-- 4. Repara patrocinadores ya vinculados que quedaron como usuario.
-- 5. Limita el acceso del sponsor a sus campañas, presupuestos y métricas.
-- 6. Recarga el esquema de PostgREST.

-- ===========================================================================
-- 1. ASEGURAR QUE EL ENUM app_role CONTENGA sponsor
-- ===========================================================================

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
  ) and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
      and e.enumlabel = 'sponsor'
  ) then
    alter type public.app_role add value 'sponsor';
  end if;
end
$$;

-- El ALTER TYPE anterior debe quedar confirmado antes de utilizar el valor.
commit;

begin;

-- ===========================================================================
-- 2. CORREGIR LA PROTECCIÓN DEL CAMPO role EN profiles
-- ===========================================================================

create or replace function public.proteger_rol_perfil()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_jwt_role text;
  v_claims jsonb;
begin
  if old.role is not distinct from new.role then
    return new;
  end if;

  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception
    when others then
      v_claims := '{}'::jsonb;
  end;

  v_jwt_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    v_claims ->> 'role',
    ''
  );

  -- SQL Editor / migraciones ejecutadas como propietario de la base.
  if session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  -- Operaciones privadas del backend con SUPABASE_SECRET_KEY/service_role.
  if v_jwt_role = 'service_role' then
    return new;
  end if;

  -- Un administrador autenticado puede administrar roles.
  if auth.uid() is not null and public.is_admin() then
    return new;
  end if;

  raise exception 'No tienes permiso para modificar el rol.'
    using errcode = 'P0001';
end;
$$;

alter function public.proteger_rol_perfil() owner to postgres;

drop trigger if exists trg_proteger_rol_perfil on public.profiles;

create trigger trg_proteger_rol_perfil
before update of role on public.profiles
for each row
execute function public.proteger_rol_perfil();

grant select, insert, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- ===========================================================================
-- 3. SINCRONIZAR AUTH -> profiles RESPETANDO EL ROL DE LA INVITACIÓN
-- ===========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_requested_role text;
  v_role public.app_role;
begin
  v_requested_role := lower(
    coalesce(
      new.raw_user_meta_data ->> 'role',
      new.raw_app_meta_data ->> 'role',
      'usuario'
    )
  );

  v_role := case
    when v_requested_role = 'sponsor' then 'sponsor'::public.app_role
    when v_requested_role = 'admin' then 'admin'::public.app_role
    else 'usuario'::public.app_role
  end;

  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'usuario'), '@', 1)
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    v_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(
      nullif(public.profiles.full_name, ''),
      excluded.full_name
    ),
    avatar_url = coalesce(
      nullif(public.profiles.avatar_url, ''),
      excluded.avatar_url
    ),
    role = case
      when v_requested_role in ('admin', 'sponsor') then excluded.role
      else public.profiles.role
    end,
    updated_at = now();

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert or update of raw_user_meta_data, raw_app_meta_data, email
on auth.users
for each row
execute function public.handle_new_user();

-- ===========================================================================
-- 4. REPARAR USUARIOS YA VINCULADOS A UN PATROCINADOR
-- ===========================================================================

update public.profiles p
set
  role = 'sponsor'::public.app_role,
  updated_at = now()
where exists (
  select 1
  from public.sponsor_members sm
  where sm.user_id = p.id
)
and p.role::text <> 'sponsor';

update auth.users u
set
  raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'sponsor'),
  raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'sponsor'),
  updated_at = now()
where exists (
  select 1
  from public.sponsor_members sm
  where sm.user_id = u.id
)
and (
  coalesce(u.raw_user_meta_data ->> 'role', '') <> 'sponsor'
  or coalesce(u.raw_app_meta_data ->> 'role', '') <> 'sponsor'
);

-- ===========================================================================
-- 5. FUNCIÓN PARA CONSULTAR EL ROL ACTUAL
-- ===========================================================================

create or replace function public.obtener_rol_actual()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role::text
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

alter function public.obtener_rol_actual() owner to postgres;

revoke all on function public.obtener_rol_actual() from public;
grant execute on function public.obtener_rol_actual() to authenticated;
grant execute on function public.obtener_rol_actual() to service_role;

-- ===========================================================================
-- 6. PERMISOS BASE DE LAS TABLAS DEL PORTAL SPONSOR
-- ===========================================================================

grant select, insert, update on table public.campaigns to authenticated;
grant select, insert, update on table public.campaign_sponsors to authenticated;
grant select on table public.campaign_metrics_daily to authenticated;
grant select on table public.campaign_budgets to authenticated;
grant select on table public.sponsor_members to authenticated;
grant select on table public.sponsor_organizations to authenticated;

grant all on table public.campaigns to service_role;
grant all on table public.campaign_sponsors to service_role;
grant all on table public.campaign_metrics_daily to service_role;
grant all on table public.campaign_budgets to service_role;
grant all on table public.sponsor_members to service_role;
grant all on table public.sponsor_organizations to service_role;

-- ===========================================================================
-- 7. POLÍTICAS: EL SPONSOR SOLO CONSULTA SUS PROPIOS DATOS
-- ===========================================================================

drop policy if exists "sponsor consulta sus metricas"
on public.campaign_metrics_daily;

create policy "sponsor consulta sus metricas"
on public.campaign_metrics_daily
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.campaign_sponsors cs
    join public.sponsor_members sm
      on sm.organization_id = cs.organization_id
    where cs.campaign_id = campaign_metrics_daily.campaign_id
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "sponsor consulta presupuesto de sus campanas"
on public.campaign_budgets;

create policy "sponsor consulta presupuesto de sus campanas"
on public.campaign_budgets
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.campaign_sponsors cs
    join public.sponsor_members sm
      on sm.organization_id = cs.organization_id
    where cs.campaign_id = campaign_budgets.campaign_id
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "sponsor consulta sus vinculaciones"
on public.campaign_sponsors;

create policy "sponsor consulta sus vinculaciones"
on public.campaign_sponsors
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.sponsor_members sm
    where sm.organization_id = campaign_sponsors.organization_id
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "sponsor consulta su membresia"
on public.sponsor_members;

create policy "sponsor consulta su membresia"
on public.sponsor_members
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
);

drop policy if exists "sponsor consulta su organizacion"
on public.sponsor_organizations;

create policy "sponsor consulta su organizacion"
on public.sponsor_organizations
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.sponsor_members sm
    where sm.organization_id = sponsor_organizations.id
      and sm.user_id = auth.uid()
  )
);

-- ===========================================================================
-- 8. RECARGAR POSTGREST
-- ===========================================================================

notify pgrst, 'reload schema';

commit;

-- ===========================================================================
-- 9. VERIFICACIÓN FINAL
-- ===========================================================================

select
  u.email,
  p.role,
  so.name as organizacion,
  sm.member_role,
  u.raw_user_meta_data ->> 'role' as rol_metadata_usuario,
  u.raw_app_meta_data ->> 'role' as rol_metadata_aplicacion
from auth.users u
join public.profiles p
  on p.id = u.id
left join public.sponsor_members sm
  on sm.user_id = u.id
left join public.sponsor_organizations so
  on so.id = sm.organization_id
where p.role::text = 'sponsor'
   or sm.user_id is not null
order by u.email;
