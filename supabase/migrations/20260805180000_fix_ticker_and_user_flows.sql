-- Home Run Rewards | instalación modular
-- Archivo: 260_corregir_cinta_y_flujos_usuario.sql
-- Corrige de forma definitiva el cambio de estado de la cinta infinita.
-- Los ajustes de promociones de usuario y flujo de mapa pertenecen al frontend.
-- Ejecutar después de 250_cinta_promociones_y_dinamica_mapa.sql.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.app_settings(key, value, updated_at)
values ('ticker_enabled', 'true'::jsonb, now())
on conflict (key) do nothing;

create or replace function public.establecer_estado_cinta(p_habilitada boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_usuario uuid := auth.uid();
  v_es_admin boolean;
begin
  if v_usuario is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select exists (
    select 1
    from public.profiles
    where id = v_usuario
      and role::text = 'admin'
  ) into v_es_admin;

  if not v_es_admin then
    raise exception 'Solo un administrador puede actualizar la cinta.';
  end if;

  insert into public.app_settings(key, value, updated_by, updated_at)
  values ('ticker_enabled', to_jsonb(p_habilitada), v_usuario, now())
  on conflict (key) do update
  set value = excluded.value,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at;

  return p_habilitada;
end;
$$;

alter function public.establecer_estado_cinta(boolean) owner to postgres;
revoke all on function public.establecer_estado_cinta(boolean) from public;
grant execute on function public.establecer_estado_cinta(boolean) to authenticated, service_role;

create or replace function public.obtener_estado_cinta()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select (value #>> '{}')::boolean
     from public.app_settings
     where key = 'ticker_enabled'
     limit 1),
    true
  );
$$;

alter function public.obtener_estado_cinta() owner to postgres;
revoke all on function public.obtener_estado_cinta() from public;
grant execute on function public.obtener_estado_cinta() to anon, authenticated, service_role;

notify pgrst, 'reload schema';

select public.obtener_estado_cinta() as cinta_habilitada;
