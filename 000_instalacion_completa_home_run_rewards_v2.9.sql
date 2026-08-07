

-- =============================================================================
-- BLOQUE 41: 381_ajustes_notificacion_promociones_puntos_demo.sql
-- =============================================================================

-- Home Run Rewards | notificación centrada, carrusel móvil y puntos seguros en demo
-- Archivo: 381_ajustes_notificacion_promociones_puntos_demo.sql
-- Ejecutar después de: 380_metricas_demo_patrocinadores_pendientes.sql
-- Idempotente.

begin;

-- Determina si el modo de ubicación simulada (demo) está activo.
create or replace function public.demo_simulation_enabled()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select case
        when jsonb_typeof(value) = 'object'
          then coalesce((value ->> 'simulatedLocationEnabled')::boolean, false)
        else false
      end
      from public.app_settings
      where key = 'demo'
      limit 1
    ),
    false
  );
$$;

alter function public.demo_simulation_enabled() owner to postgres;
revoke all on function public.demo_simulation_enabled() from public;
grant execute on function public.demo_simulation_enabled() to authenticated;
grant execute on function public.demo_simulation_enabled() to service_role;

-- En demo se conserva la participación para poder mostrar el flujo completo,
-- pero no se registran puntos reales en la participación.
create or replace function public.zero_participation_points_in_demo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.demo_simulation_enabled() then
    new.points_awarded := 0;
    new.metadata := coalesce(new.metadata, '{}'::jsonb)
      || jsonb_build_object('demo', true, 'pointsSuppressed', true);
  end if;
  return new;
end;
$$;

alter function public.zero_participation_points_in_demo() owner to postgres;

drop trigger if exists participations_zero_points_in_demo on public.participations;
create trigger participations_zero_points_in_demo
before insert on public.participations
for each row
execute function public.zero_participation_points_in_demo();

-- Segunda barrera: cualquier origen de puntos (QR, mapa, visita/ticket u otros)
-- queda en cero mientras la ubicación simulada esté encendida.
create or replace function public.zero_point_transaction_in_demo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.demo_simulation_enabled() then
    new.points := 0;
    new.description := concat_ws(' · ', nullif(new.description, ''), 'DEMO - sin puntos reales');
  end if;
  return new;
end;
$$;

alter function public.zero_point_transaction_in_demo() owner to postgres;

drop trigger if exists point_transactions_zero_in_demo on public.point_transactions;
create trigger point_transactions_zero_in_demo
before insert on public.point_transactions
for each row
execute function public.zero_point_transaction_in_demo();

notify pgrst, 'reload schema';

commit;

-- Verificación rápida
select public.demo_simulation_enabled() as demo_activo;
