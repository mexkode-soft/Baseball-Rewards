-- Home Run Rewards | instalación modular
-- Archivo: 190_interruptor_cinta_extremo_a_extremo.sql
-- Fuente histórica: 20260803173000_fix_ticker_toggle_end_to_end.sql
-- Ejecutar únicamente después del archivo anterior.

-- Corrige de extremo a extremo el interruptor de la cinta infinita.
-- La tabla real public.app_settings usa key/value.

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

drop policy if exists app_settings_public_read on public.app_settings;
create policy app_settings_public_read
  on public.app_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write
  on public.app_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Permite que los cambios se propaguen por Supabase Realtime.
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
