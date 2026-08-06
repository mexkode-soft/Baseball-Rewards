-- Home Run Rewards | instalación modular
-- Archivo: 220_corregir_roles_y_rls_perfiles.sql
-- Propósito:
--   1. Corregir políticas RLS duplicadas o recursivas en public.profiles.
--   2. Permitir que la aplicación consulte correctamente el rol del usuario.
--   3. Evitar que un usuario cambie su propio rol desde el cliente.
-- Ejecutar después de: 210_endurecimiento_produccion.sql

-- ---------------------------------------------------------------------------
-- 1. Eliminar políticas históricas o duplicadas
-- ---------------------------------------------------------------------------

drop policy if exists admin_profiles_read
on public.profiles;

drop policy if exists profiles_self_read
on public.profiles;

drop policy if exists profiles_self_update
on public.profiles;

drop policy if exists "Usuarios consultan su perfil"
on public.profiles;

drop policy if exists "Usuarios actualizan su perfil"
on public.profiles;

drop policy if exists "Usuarios insertan su perfil"
on public.profiles;

drop policy if exists "perfil_lectura_propia"
on public.profiles;

drop policy if exists "administradores_consultan_perfiles"
on public.profiles;

drop policy if exists "perfil_actualizacion_propia"
on public.profiles;

drop policy if exists "perfil_insercion_propia"
on public.profiles;

drop policy if exists "administradores_actualizan_perfiles"
on public.profiles;


-- ---------------------------------------------------------------------------
-- 2. Funciones auxiliares seguras
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'admin'
  );
$$;

alter function public.is_admin() owner to postgres;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;


create or replace function public.obtener_rol_actual()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role::text
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

alter function public.obtener_rol_actual() owner to postgres;

revoke all on function public.obtener_rol_actual() from public;
grant execute on function public.obtener_rol_actual() to authenticated;
grant execute on function public.obtener_rol_actual() to service_role;


-- ---------------------------------------------------------------------------
-- 3. Políticas RLS limpias
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- Cada usuario puede consultar su propio perfil.
create policy "perfil_lectura_propia"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
);

-- Los administradores pueden consultar todos los perfiles.
create policy "administradores_consultan_perfiles"
on public.profiles
for select
to authenticated
using (
  public.is_admin()
);

-- Cada usuario puede actualizar su propio perfil, pero no puede cambiar su rol.
create policy "perfil_actualizacion_propia"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
  and role::text = public.obtener_rol_actual()
);

-- Los administradores pueden actualizar perfiles, incluidos los roles.
create policy "administradores_actualizan_perfiles"
on public.profiles
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- Permite crear el perfil propio únicamente con el rol inicial de usuario.
create policy "perfil_insercion_propia"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role::text = 'usuario'
);


-- ---------------------------------------------------------------------------
-- 4. Recargar la caché de esquema de PostgREST
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------------
-- 5. Verificación no destructiva
-- ---------------------------------------------------------------------------

select
  policyname as politica,
  cmd as operacion,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;

select
  p.id,
  u.email,
  p.role
from public.profiles p
join auth.users u on u.id = p.id
order by u.email;
