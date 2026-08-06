-- Home Run Rewards | reparación integral de patrocinadores
-- Archivo: 320_reparacion_patrocinadores_y_carrusel.sql
-- Ejecutar una sola vez en el SQL Editor de Supabase con el rol postgres.
-- Es idempotente: puede volver a ejecutarse sin duplicar políticas.

begin;

-- El backend privado (SUPABASE_SECRET_KEY / service_role) necesita privilegios
-- SQL además de omitir RLS.
grant usage on schema public to service_role;
grant all privileges on table public.sponsor_organizations to service_role;
grant all privileges on table public.sponsor_members to service_role;
grant all privileges on table public.subscription_plans to service_role;
grant all privileges on table public.profiles to service_role;
grant all privileges on table public.campaign_sponsors to service_role;
grant all privileges on table public.campaign_budgets to service_role;
grant all privileges on table public.campaigns to service_role;

-- El cliente autenticado requiere permisos base; RLS decide qué filas puede usar.
grant select, insert, update, delete on table public.sponsor_organizations to authenticated;
grant select, insert, update, delete on table public.sponsor_members to authenticated;
grant select on table public.subscription_plans to authenticated;
grant select, insert, update, delete on table public.campaign_sponsors to authenticated;
grant select, insert, update, delete on table public.campaign_budgets to authenticated;
grant select on table public.campaigns to authenticated;

-- Políticas administrativas consistentes.
drop policy if exists sponsor_org_admin_write on public.sponsor_organizations;
drop policy if exists sponsor_organizations_admin_read_all on public.sponsor_organizations;
drop policy if exists "administradores gestionan patrocinadores" on public.sponsor_organizations;

create policy "administradores gestionan patrocinadores"
on public.sponsor_organizations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists sponsor_members_admin_all on public.sponsor_members;
drop policy if exists "administradores gestionan miembros patrocinadores" on public.sponsor_members;

create policy "administradores gestionan miembros patrocinadores"
on public.sponsor_members
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists campaign_sponsors_admin_all on public.campaign_sponsors;
drop policy if exists sponsor_links_admin on public.campaign_sponsors;
drop policy if exists "administradores gestionan campañas patrocinadas" on public.campaign_sponsors;

create policy "administradores gestionan campañas patrocinadas"
on public.campaign_sponsors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists campaign_budgets_admin_all on public.campaign_budgets;
drop policy if exists "administradores gestionan presupuestos" on public.campaign_budgets;

create policy "administradores gestionan presupuestos"
on public.campaign_budgets
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Garantiza privilegios futuros para objetos creados por postgres.
alter default privileges for role postgres in schema public
grant all privileges on tables to service_role;

alter default privileges for role postgres in schema public
grant usage, select on sequences to service_role;

notify pgrst, 'reload schema';

commit;

-- Verificación rápida.
select
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'sponsor_organizations',
    'sponsor_members',
    'campaign_sponsors',
    'campaign_budgets'
  )
order by tablename, policyname;
