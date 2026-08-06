-- Home Run Rewards | envío de campañas del patrocinador a aprobación
-- Archivo: 340_envio_campanas_patrocinador.sql
-- Ejecutar después de 330_roles_patrocinador_y_portal_corregida.sql
-- Idempotente: puede ejecutarse nuevamente.

begin;

-- Permisos SQL base. RLS continúa protegiendo cada operación.
grant select, insert, update on public.campaigns to authenticated;
grant select, insert, update, delete on public.campaign_sponsors to authenticated;
grant select, insert, update, delete on public.qr_codes to authenticated;
grant select, insert, update, delete on public.campaign_questions to authenticated;
grant select, insert, update, delete on public.campaign_locations to authenticated;
grant select, insert, update, delete on public.brand_rules to authenticated;

-- El patrocinador puede crear una campaña propia. Siempre se envía como draft.
drop policy if exists "sponsor crea campañas para revisión" on public.campaigns;
create policy "sponsor crea campañas para revisión"
on public.campaigns
for insert
to authenticated
with check (
  created_by = auth.uid()
  and status = 'draft'
  and public.obtener_rol_actual() = 'sponsor'
);

-- Puede consultar y corregir sus campañas mientras no estén aprobadas/activas.
drop policy if exists "sponsor consulta sus campañas" on public.campaigns;
create policy "sponsor consulta sus campañas"
on public.campaigns
for select
to authenticated
using (
  public.is_admin()
  or created_by = auth.uid()
  or exists (
    select 1
    from public.campaign_sponsors cs
    join public.sponsor_members sm on sm.organization_id = cs.organization_id
    where cs.campaign_id = campaigns.id
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "sponsor edita campañas pendientes" on public.campaigns;
create policy "sponsor edita campañas pendientes"
on public.campaigns
for update
to authenticated
using (
  created_by = auth.uid()
  and public.obtener_rol_actual() = 'sponsor'
  and status = 'draft'
)
with check (
  created_by = auth.uid()
  and public.obtener_rol_actual() = 'sponsor'
  and status = 'draft'
);

-- Vinculación con su propia organización y estado obligatorio de revisión.
drop policy if exists "sponsor vincula campaña a su organización" on public.campaign_sponsors;
create policy "sponsor vincula campaña a su organización"
on public.campaign_sponsors
for insert
to authenticated
with check (
  approval_status = 'in_review'
  and exists (
    select 1 from public.sponsor_members sm
    where sm.organization_id = campaign_sponsors.organization_id
      and sm.user_id = auth.uid()
  )
  and exists (
    select 1 from public.campaigns c
    where c.id = campaign_sponsors.campaign_id
      and c.created_by = auth.uid()
      and c.status = 'draft'
  )
);

drop policy if exists "sponsor actualiza vínculo pendiente" on public.campaign_sponsors;
create policy "sponsor actualiza vínculo pendiente"
on public.campaign_sponsors
for update
to authenticated
using (
  exists (
    select 1 from public.sponsor_members sm
    where sm.organization_id = campaign_sponsors.organization_id
      and sm.user_id = auth.uid()
  )
)
with check (
  approval_status = 'in_review'
  and exists (
    select 1 from public.sponsor_members sm
    where sm.organization_id = campaign_sponsors.organization_id
      and sm.user_id = auth.uid()
  )
);

-- Elementos internos de una campaña creada por el patrocinador.
drop policy if exists "sponsor gestiona qr de campaña propia" on public.qr_codes;
create policy "sponsor gestiona qr de campaña propia"
on public.qr_codes for all to authenticated
using (exists (select 1 from public.campaigns c where c.id = qr_codes.campaign_id and c.created_by = auth.uid() and c.status = 'draft'))
with check (exists (select 1 from public.campaigns c where c.id = qr_codes.campaign_id and c.created_by = auth.uid() and c.status = 'draft'));

drop policy if exists "sponsor gestiona preguntas de campaña propia" on public.campaign_questions;
create policy "sponsor gestiona preguntas de campaña propia"
on public.campaign_questions for all to authenticated
using (exists (select 1 from public.campaigns c where c.id = campaign_questions.campaign_id and c.created_by = auth.uid() and c.status = 'draft'))
with check (exists (select 1 from public.campaigns c where c.id = campaign_questions.campaign_id and c.created_by = auth.uid() and c.status = 'draft'));

drop policy if exists "sponsor gestiona ubicaciones de campaña propia" on public.campaign_locations;
create policy "sponsor gestiona ubicaciones de campaña propia"
on public.campaign_locations for all to authenticated
using (exists (select 1 from public.campaigns c where c.id = campaign_locations.campaign_id and c.created_by = auth.uid() and c.status = 'draft'))
with check (exists (select 1 from public.campaigns c where c.id = campaign_locations.campaign_id and c.created_by = auth.uid() and c.status = 'draft'));

drop policy if exists "sponsor gestiona reglas de campaña propia" on public.brand_rules;
create policy "sponsor gestiona reglas de campaña propia"
on public.brand_rules for all to authenticated
using (exists (select 1 from public.campaigns c where c.id = brand_rules.campaign_id and c.created_by = auth.uid() and c.status = 'draft'))
with check (exists (select 1 from public.campaigns c where c.id = brand_rules.campaign_id and c.created_by = auth.uid() and c.status = 'draft'));

notify pgrst, 'reload schema';
commit;
