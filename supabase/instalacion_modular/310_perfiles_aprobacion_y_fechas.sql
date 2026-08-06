-- Home Run Rewards | Correcciones de permisos y fechas
-- Archivo: 310_perfiles_aprobacion_y_fechas.sql
-- Ejecutar después de: 300_segmentacion_geografica_comunicados.sql
--
-- Corrige:
-- 1. Actualización del perfil propio sin permitir autoasignación de rol.
-- 2. Lectura administrativa de campaign_budgets y tablas relacionadas.
-- 3. Recarga del esquema de PostgREST.

begin;

-- ---------------------------------------------------------------------------
-- 1. PROFILES: permisos y política de actualización propia
-- ---------------------------------------------------------------------------

grant select, update on table public.profiles to authenticated;

drop policy if exists "perfil_actualizacion_propia" on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists "Usuarios actualizan su perfil" on public.profiles;

create policy "perfil_actualizacion_propia"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Protege el rol aunque el usuario pueda actualizar sus demás datos.
create or replace function public.proteger_rol_perfil()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'No tienes permiso para modificar el rol.';
  end if;

  return new;
end;
$$;

alter function public.proteger_rol_perfil() owner to postgres;

drop trigger if exists trg_proteger_rol_perfil on public.profiles;

create trigger trg_proteger_rol_perfil
before update on public.profiles
for each row
execute function public.proteger_rol_perfil();

-- ---------------------------------------------------------------------------
-- 2. APROBACIÓN DE CAMPAÑAS
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on table public.campaign_budgets to authenticated;
grant select on table public.campaigns to authenticated;
grant select on table public.campaign_sponsors to authenticated;
grant select on table public.sponsor_organizations to authenticated;

drop policy if exists campaign_budgets_admin_all on public.campaign_budgets;
drop policy if exists "administradores gestionan presupuestos" on public.campaign_budgets;
drop policy if exists "administradores consultan presupuestos" on public.campaign_budgets;

create policy "administradores gestionan presupuestos"
on public.campaign_budgets
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists campaign_sponsors_admin_all on public.campaign_sponsors;
drop policy if exists "administradores gestionan campañas patrocinadas" on public.campaign_sponsors;

create policy "administradores gestionan campañas patrocinadas"
on public.campaign_sponsors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists sponsor_organizations_admin_all on public.sponsor_organizations;
drop policy if exists "administradores gestionan patrocinadores" on public.sponsor_organizations;

create policy "administradores gestionan patrocinadores"
on public.sponsor_organizations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';

commit;

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'campaign_budgets',
    'campaign_sponsors',
    'sponsor_organizations'
  )
order by tablename, policyname;
