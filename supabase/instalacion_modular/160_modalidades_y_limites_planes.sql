-- Home Run Rewards | instalación modular
-- Archivo: 160_modalidades_y_limites_planes.sql
-- Fuente histórica: 20260803161000_sponsor_campaign_modalities_and_plan_enforcement.sql
-- Ejecutar únicamente después del archivo anterior.

-- Modalidades por plan para patrocinadores y permisos de configuración.

create or replace function public.validate_sponsor_campaign_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type public.campaign_type;
  v_plan public.subscription_plans%rowtype;
begin
  select c.type into v_type from public.campaigns c where c.id = new.campaign_id;
  select sp.* into v_plan
  from public.sponsor_organizations so
  join public.subscription_plans sp on sp.code = so.plan_code
  where so.id = new.organization_id;

  if v_plan.code is null then
    raise exception 'La organización no tiene un plan válido.';
  end if;
  if v_type = 'brand' and not v_plan.allows_ticket then
    raise exception 'El plan contratado no permite campañas por ticket.';
  end if;
  if v_type = 'qr' and not v_plan.allows_qr then
    raise exception 'El plan contratado no permite campañas QR.';
  end if;
  if v_type = 'map' and not v_plan.allows_map then
    raise exception 'El plan contratado no permite campañas de mapa.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_sponsor_campaign_plan_trigger on public.campaign_sponsors;
create trigger validate_sponsor_campaign_plan_trigger
before insert or update of organization_id, campaign_id on public.campaign_sponsors
for each row execute function public.validate_sponsor_campaign_plan();

drop policy if exists sponsor_qr_codes_write on public.qr_codes;
create policy sponsor_qr_codes_write on public.qr_codes
for all
using (public.sponsor_owns_campaign(campaign_id))
with check (public.sponsor_owns_campaign(campaign_id));

drop policy if exists sponsor_campaign_locations_write on public.campaign_locations;
create policy sponsor_campaign_locations_write on public.campaign_locations
for all
using (public.sponsor_owns_campaign(campaign_id))
with check (public.sponsor_owns_campaign(campaign_id));
