-- Home Run Rewards | reparación de permisos para consentimientos
-- Archivo: 361_reparacion_permisos_user_consents.sql
-- Ejecutar después de: 360_registro_legal_y_consentimientos.sql
-- Migración idempotente: puede ejecutarse nuevamente sin duplicar políticas.

begin;

-- ===========================================================================
-- 1. ASEGURAR RLS Y PERMISOS DE TABLA
-- ===========================================================================

alter table public.user_consents enable row level security;

revoke all on table public.user_consents from anon;

grant select, insert on table public.user_consents to authenticated;
grant all on table public.user_consents to service_role;

-- ===========================================================================
-- 2. POLÍTICAS RLS
-- ===========================================================================

-- El usuario autenticado puede consultar únicamente sus consentimientos.
-- El administrador puede consultar todos.
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

-- El usuario autenticado solamente puede registrar consentimientos para sí mismo.
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

-- Los consentimientos funcionan como evidencia histórica.
-- No se permite su modificación o eliminación directa por usuarios.
drop policy if exists user_consents_self_update
on public.user_consents;

drop policy if exists user_consents_self_delete
on public.user_consents;

-- ===========================================================================
-- 3. RECARGAR ESQUEMA DE POSTGREST
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
