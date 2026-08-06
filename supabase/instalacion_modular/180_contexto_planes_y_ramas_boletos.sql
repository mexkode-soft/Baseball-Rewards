-- Home Run Rewards | instalación modular
-- Archivo: 180_contexto_planes_y_ramas_boletos.sql
-- Fuente histórica: 20260803170000_fix_sponsor_plan_context_and_ticket_branches.sql
-- Ejecutar únicamente después del archivo anterior.

-- Resolve sponsor organization and subscription plan in one secure call.
-- Also allows sponsors to register the valid branches for ticket campaigns.

create or replace function public.get_my_sponsor_context()
returns table (
  organization_id uuid,
  organization_name text,
  plan_code text,
  plan_name text,
  allows_ticket boolean,
  allows_qr boolean,
  allows_map boolean,
  max_active_campaigns integer,
  membership_status text,
  membership_ends_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    so.id,
    so.name,
    coalesce(so.plan_code, 'basic'),
    sp.name,
    sp.allows_ticket,
    sp.allows_qr,
    sp.allows_map,
    sp.max_active_campaigns,
    so.membership_status,
    so.membership_ends_at
  from public.sponsor_members sm
  join public.sponsor_organizations so
    on so.id = sm.organization_id
  join public.subscription_plans sp
    on sp.code = coalesce(so.plan_code, 'basic')
  where sm.user_id = auth.uid()
    and so.is_active = true
  order by sm.created_at asc
  limit 1;
$$;

revoke all on function public.get_my_sponsor_context() from public;
grant execute on function public.get_my_sponsor_context() to authenticated;

-- The plan catalogue is not sensitive and can be read by authenticated users.
alter table public.subscription_plans enable row level security;
drop policy if exists subscription_plans_authenticated_read on public.subscription_plans;
create policy subscription_plans_authenticated_read
  on public.subscription_plans
  for select
  to authenticated
  using (true);

-- Sponsors may insert and read branches only for campaigns that belong to their organization.
alter table public.brand_locations enable row level security;

drop policy if exists brand_locations_sponsor_read on public.brand_locations;
create policy brand_locations_sponsor_read
  on public.brand_locations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.campaign_sponsors cs
      join public.sponsor_members sm
        on sm.organization_id = cs.organization_id
      where cs.campaign_id = brand_locations.campaign_id
        and sm.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists brand_locations_sponsor_insert on public.brand_locations;
create policy brand_locations_sponsor_insert
  on public.brand_locations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.campaign_sponsors cs
      join public.sponsor_members sm
        on sm.organization_id = cs.organization_id
      where cs.campaign_id = brand_locations.campaign_id
        and sm.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists brand_locations_sponsor_update on public.brand_locations;
create policy brand_locations_sponsor_update
  on public.brand_locations
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.campaign_sponsors cs
      join public.sponsor_members sm
        on sm.organization_id = cs.organization_id
      where cs.campaign_id = brand_locations.campaign_id
        and sm.user_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1
      from public.campaign_sponsors cs
      join public.sponsor_members sm
        on sm.organization_id = cs.organization_id
      where cs.campaign_id = brand_locations.campaign_id
        and sm.user_id = auth.uid()
    )
    or public.is_admin()
  );
