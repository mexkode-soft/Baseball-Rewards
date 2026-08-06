-- Home Run Rewards | instalación modular
-- Archivo: 280_promociones_portadas_y_aprobacion.sql
-- Ejecutar después de 270_comunicados_bandeja_y_push.sql

-- Permisos para editar promociones.
alter table public.promotions add column if not exists updated_at timestamptz not null default now();
alter table public.promotions enable row level security;
drop policy if exists promotions_admin_all on public.promotions;
create policy promotions_admin_all on public.promotions for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists promotions_public_read_active on public.promotions;
create policy promotions_public_read_active on public.promotions for select to authenticated using (is_active = true or public.is_admin());

-- Permisos para consultar presupuestos durante la aprobación de campañas.
alter table public.campaign_budgets enable row level security;
drop policy if exists campaign_budgets_admin_all on public.campaign_budgets;
create policy campaign_budgets_admin_all on public.campaign_budgets for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Los administradores deben poder consultar las campañas y relaciones de patrocinador.
drop policy if exists campaigns_admin_read_all on public.campaigns;
create policy campaigns_admin_read_all on public.campaigns for select to authenticated using (public.is_admin());
drop policy if exists campaign_sponsors_admin_read_all on public.campaign_sponsors;
create policy campaign_sponsors_admin_read_all on public.campaign_sponsors for select to authenticated using (public.is_admin());
drop policy if exists sponsor_organizations_admin_read_all on public.sponsor_organizations;
create policy sponsor_organizations_admin_read_all on public.sponsor_organizations for select to authenticated using (public.is_admin());

-- Permisos de Storage para portadas de campañas.
drop policy if exists campaign_images_admin_insert on storage.objects;
create policy campaign_images_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'campaign-images' and public.is_admin());
drop policy if exists campaign_images_admin_update on storage.objects;
create policy campaign_images_admin_update on storage.objects for update to authenticated using (bucket_id = 'campaign-images' and public.is_admin()) with check (bucket_id = 'campaign-images' and public.is_admin());
drop policy if exists campaign_images_admin_delete on storage.objects;
create policy campaign_images_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'campaign-images' and public.is_admin());
drop policy if exists campaign_images_public_read on storage.objects;
create policy campaign_images_public_read on storage.objects for select using (bucket_id = 'campaign-images');

notify pgrst, 'reload schema';
