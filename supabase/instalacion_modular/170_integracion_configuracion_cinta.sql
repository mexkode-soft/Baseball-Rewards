-- Home Run Rewards | instalación modular
-- Archivo: 170_integracion_configuracion_cinta.sql
-- Fuente histórica: 20260803162000_fix_ticker_setting_integration.sql
-- Ejecutar únicamente después del archivo anterior.

-- Corrige la integración del interruptor de la cinta infinita con la estructura
-- real de public.app_settings (columnas key/value).

insert into public.app_settings (
  key,
  value,
  updated_at
)
values (
  'ticker_enabled',
  'true'::jsonb,
  now()
)
on conflict (key)
do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read
  on public.app_settings
  for select
  using (true);

drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin
  on public.app_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Realtime necesita que la tabla forme parte de la publicación. El bloque es
-- idempotente y no falla cuando ya estaba agregada.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end;
$$;
