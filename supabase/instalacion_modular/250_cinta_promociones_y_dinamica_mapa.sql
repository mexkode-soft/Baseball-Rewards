-- Home Run Rewards | instalación modular
-- Archivo: 250_cinta_promociones_y_dinamica_mapa.sql
-- Corrige el interruptor de la cinta infinita mediante RPCs estables.
-- Los ajustes visuales de promociones y la dinámica de mapa viven en el frontend.
-- Ejecutar después de 240_permisos_modulos_admin_y_comunicados.sql.

-- ---------------------------------------------------------------------------
-- 1. Normalizar la configuración de la cinta
-- ---------------------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.app_settings(key, value, updated_at)
values ('ticker_enabled', 'true'::jsonb, now())
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

grant select on table public.app_settings to anon, authenticated;
grant insert, update, delete on table public.app_settings to authenticated;

drop policy if exists app_settings_authenticated_read on public.app_settings;
create policy app_settings_authenticated_read
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists app_settings_admin_all on public.app_settings;
create policy app_settings_admin_all
on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Lectura estable para la página pública y los paneles
-- ---------------------------------------------------------------------------

create or replace function public.obtener_estado_cinta()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select case
        when jsonb_typeof(value) = 'boolean' then (value #>> '{}')::boolean
        when lower(value #>> '{}') in ('true', '1', 'on', 'yes') then true
        else false
      end
      from public.app_settings
      where key = 'ticker_enabled'
      limit 1
    ),
    true
  );
$$;

alter function public.obtener_estado_cinta() owner to postgres;
revoke all on function public.obtener_estado_cinta() from public;
grant execute on function public.obtener_estado_cinta() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Actualización administrativa segura
-- ---------------------------------------------------------------------------

create or replace function public.actualizar_estado_cinta(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_admin() then
    raise exception 'Solo un administrador puede actualizar la cinta.';
  end if;

  insert into public.app_settings(key, value, updated_by, updated_at)
  values ('ticker_enabled', to_jsonb(p_enabled), auth.uid(), now())
  on conflict (key) do update
  set value = excluded.value,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at;

  return p_enabled;
end;
$$;

alter function public.actualizar_estado_cinta(boolean) owner to postgres;
revoke all on function public.actualizar_estado_cinta(boolean) from public;
grant execute on function public.actualizar_estado_cinta(boolean) to authenticated, service_role;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 4. Verificación
-- ---------------------------------------------------------------------------

select public.obtener_estado_cinta() as cinta_habilitada;
