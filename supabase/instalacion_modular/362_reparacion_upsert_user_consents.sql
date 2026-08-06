-- Home Run Rewards | reparación de UPSERT para consentimientos
-- Archivo: 362_reparacion_upsert_user_consents.sql
-- Ejecutar después de: 361_reparacion_permisos_user_consents.sql
-- Migración idempotente: puede ejecutarse nuevamente sin duplicar políticas.

begin;

-- ===========================================================================
-- 1. PERMISOS NECESARIOS PARA UPSERT
-- ===========================================================================

grant select, insert, update
on table public.user_consents
to authenticated;

grant all
on table public.user_consents
to service_role;

-- ===========================================================================
-- 2. POLÍTICAS RLS
-- ===========================================================================

-- Lectura de consentimientos propios; administradores pueden consultar todos.
drop policy if exists user_consents_self_read
on public.user_consents;

create policy user_consents_self_read
on public.user_consents
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

-- Inserción únicamente para el usuario autenticado.
drop policy if exists user_consents_self_insert
on public.user_consents;

create policy user_consents_self_insert
on public.user_consents
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
);

-- Actualización necesaria para que UPSERT funcione cuando el consentimiento
-- ya existe para el usuario y la misma versión del documento.
drop policy if exists user_consents_self_update
on public.user_consents;

create policy user_consents_self_update
on public.user_consents
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

-- Se conserva la evidencia histórica: no se permite DELETE al usuario.
drop policy if exists user_consents_self_delete
on public.user_consents;

-- ===========================================================================
-- 3. RECARGAR POSTGREST
-- ===========================================================================

notify pgrst, 'reload schema';

commit;

-- ===========================================================================
-- 4. VERIFICACIÓN FINAL
-- ===========================================================================

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'user_consents'
order by policyname;

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'user_consents'
order by grantee, privilege_type;
