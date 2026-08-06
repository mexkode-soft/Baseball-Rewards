-- Home Run Rewards | alta correcta de patrocinadores y portal limitado
-- Archivo: 330_roles_patrocinador_y_portal.sql
-- Ejecutar después de: 320_reparacion_patrocinadores_y_carrusel.sql
-- Esta migración es idempotente y puede ejecutarse nuevamente.

-- ---------------------------------------------------------------------------
-- 1. Asegurar que el rol sponsor sea válido
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
  ) and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
      and e.enumlabel = 'sponsor'
  ) then
    alter type public.app_role add value 'sponsor';
  end if;
end
$$;

begin;

-- ---------------------------------------------------------------------------
-- 2. Sincronizar Auth -> profiles respetando el rol de la invitación
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_requested_role text;
  v_role public.app_role;
begin
  v_requested_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'usuario'));

  v_role := case
    when v_requested_role = 'sponsor' then 'sponsor'::public.app_role
    when v_requested_role = 'admin' then 'admin'::public.app_role
    else 'usuario'::public.app_role
  end;

  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'usuario'), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    v_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    role = case
      when v_requested_role in ('admin', 'sponsor') then excluded.role
      else public.profiles.role
    end,
    updated_at = now();

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of raw_user_meta_data, email
on auth.users
for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Reparar usuarios ya vinculados a una organización patrocinadora
-- ---------------------------------------------------------------------------

update public.profiles p
set role = 'sponsor'::public.app_role,
    updated_at = now()
where exists (
  select 1
  from public.sponsor_members sm
  where sm.user_id = p.id
)
and p.role::text <> 'sponsor';

update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'sponsor')
where exists (
  select 1
  from public.sponsor_members sm
  where sm.user_id = u.id
)
and coalesce(u.raw_user_meta_data ->> 'role', '') <> 'sponsor';

-- ---------------------------------------------------------------------------
-- 4. Función para consultar rol y permisos
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 5. Acceso del sponsor únicamente a sus datos de campañas y métricas
-- ---------------------------------------------------------------------------

grant select, insert, update on public.campaigns to authenticated;
grant select, insert, update on public.campaign_sponsors to authenticated;
grant select on public.campaign_metrics_daily to authenticated;
grant select on public.campaign_budgets to authenticated;
grant select on public.sponsor_members to authenticated;
grant select on public.sponsor_organizations to authenticated;

-- Las políticas existentes se conservan; agregamos únicamente las necesarias.
drop policy if exists "sponsor consulta sus metricas" on public.campaign_metrics_daily;
create policy "sponsor consulta sus metricas"
on public.campaign_metrics_daily
for select
to authenticated
using (
  exists (
    select 1
    from public.campaign_sponsors cs
    join public.sponsor_members sm
      on sm.organization_id = cs.organization_id
    where cs.campaign_id = campaign_metrics_daily.campaign_id
      and sm.user_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists "sponsor consulta presupuesto de sus campanas" on public.campaign_budgets;
create policy "sponsor consulta presupuesto de sus campanas"
on public.campaign_budgets
for select
to authenticated
using (
  exists (
    select 1
    from public.campaign_sponsors cs
    join public.sponsor_members sm
      on sm.organization_id = cs.organization_id
    where cs.campaign_id = campaign_budgets.campaign_id
      and sm.user_id = auth.uid()
  )
  or public.is_admin()
);

notify pgrst, 'reload schema';

commit;

-- Verificación final
select
  u.email,
  p.role,
  so.name as organizacion,
  sm.member_role
from auth.users u
join public.profiles p on p.id = u.id
left join public.sponsor_members sm on sm.user_id = u.id
left join public.sponsor_organizations so on so.id = sm.organization_id
where p.role::text = 'sponsor'
   or sm.user_id is not null
order by u.email;
