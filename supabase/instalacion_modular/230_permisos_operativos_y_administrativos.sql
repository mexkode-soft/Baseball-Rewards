-- Home Run Rewards | instalación modular
-- Archivo: 230_permisos_operativos_y_administrativos.sql
-- Corrige los privilegios SQL y las políticas RLS de módulos administrativos.
-- Ejecutar después de 220_corregir_roles_y_rls_perfiles.sql.
--
-- IMPORTANTE:
-- No recorre todas las tablas del esquema public porque extensiones como PostGIS
-- crean objetos del sistema (por ejemplo, public.spatial_ref_sys) cuyo propietario
-- no es el rol postgres del proyecto. Intentar alterar esos objetos provoca:
--   must be owner of table spatial_ref_sys

-- ---------------------------------------------------------------------------
-- 1. Privilegios mínimos para los módulos afectados
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, insert, update, delete
on table
  public.questions,
  public.levels,
  public.sponsor_organizations,
  public.campaign_sponsors
 to authenticated;

-- ---------------------------------------------------------------------------
-- 2. RLS únicamente en tablas propias de la aplicación
-- ---------------------------------------------------------------------------

alter table public.questions enable row level security;
alter table public.levels enable row level security;
alter table public.sponsor_organizations enable row level security;
alter table public.campaign_sponsors enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Políticas administrativas idempotentes
-- ---------------------------------------------------------------------------

drop policy if exists admin_questions_all on public.questions;
create policy admin_questions_all
on public.questions
for all
 to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_levels_all on public.levels;
create policy admin_levels_all
on public.levels
for all
 to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists sponsor_org_admin_write on public.sponsor_organizations;
create policy sponsor_org_admin_write
on public.sponsor_organizations
for all
 to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists sponsor_links_admin on public.campaign_sponsors;
create policy sponsor_links_admin
on public.campaign_sponsors
for all
 to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Recargar el esquema expuesto por PostgREST
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 5. Verificación
-- ---------------------------------------------------------------------------

select
  tablename as tabla,
  policyname as politica,
  cmd as operacion
from pg_policies
where schemaname = 'public'
  and tablename in (
    'questions',
    'levels',
    'sponsor_organizations',
    'campaign_sponsors'
  )
order by tablename, policyname;
