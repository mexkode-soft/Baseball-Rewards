-- Home Run Rewards | actualización incremental
-- Garantiza que PostgREST reconozca la función RPC utilizada por el frontend.

create or replace function public.obtener_rol_actual()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role::text
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

alter function public.obtener_rol_actual() owner to postgres;
revoke all on function public.obtener_rol_actual() from public;
grant execute on function public.obtener_rol_actual() to authenticated;
grant execute on function public.obtener_rol_actual() to service_role;

notify pgrst, 'reload schema';
