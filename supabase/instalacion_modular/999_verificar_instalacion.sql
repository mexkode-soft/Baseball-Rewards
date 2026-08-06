-- Home Run Rewards
-- Verificación no destructiva de la instalación modular.
-- Este archivo no modifica información.

with objetos_requeridos(tipo, nombre) as (
  values
    ('tabla','profiles'),
    ('tabla','campaigns'),
    ('tabla','participations'),
    ('tabla','reward_claims'),
    ('tabla','notifications'),
    ('tabla','broadcasts'),
    ('tabla','push_jobs'),
    ('tabla','seasons'),
    ('tabla','sponsor_organizations'),
    ('tabla','app_settings'),
    ('funcion','scan_qr'),
    ('funcion','publish_broadcast'),
    ('funcion','mark_all_notifications_read'),
    ('funcion','publicar_comunicado_seguro'),
    ('funcion','claim_reward_atomic'),
    ('funcion','obtener_rol_actual')
), comprobacion as (
  select tipo, nombre,
    case
      when tipo='tabla' then to_regclass('public.'||nombre) is not null
      when tipo='funcion' then exists (
        select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname=nombre
      )
      else false
    end as existe
  from objetos_requeridos
)
select tipo, nombre, existe, case when existe then 'OK' else 'FALTA' end as estado
from comprobacion
order by tipo, nombre;

-- Resumen de RLS.
select c.relname as tabla, c.relrowsecurity as rls_habilitado, count(p.policyname) as politicas
from pg_class c
join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
left join pg_policies p on p.schemaname='public' and p.tablename=c.relname
where c.relkind='r'
  and c.relname in ('profiles','campaigns','participations','reward_claims','notifications','broadcasts','push_jobs','sponsor_organizations','app_settings')
group by c.relname,c.relrowsecurity
order by c.relname;

-- Buckets esperados.
select id, public, file_size_limit
from storage.buckets
where id in ('avatars','ticket-images','promotion-images','campaign-images')
order by id;


-- Verificación de privilegios para el rol autenticado
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in ('questions','levels','campaign_sponsors','sponsor_organizations','campaigns','campaign_questions','campaign_locations','qr_codes','brand_rules','brand_locations','seasons','promotions','announcements','broadcasts','push_jobs')
order by table_name, privilege_type;


-- Verificación v1.7: funciones de cinta infinita.
select
  p.proname as funcion,
  pg_get_function_identity_arguments(p.oid) as parametros
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('obtener_estado_cinta', 'actualizar_estado_cinta')
order by p.proname;

-- Verificación v2.1: comunicados y cola push.
select
  to_regprocedure('public.publicar_comunicado_seguro(jsonb)') is not null as rpc_comunicados,
  to_regclass('public.notifications_user_broadcast_uidx') is not null as indice_notificaciones,
  to_regclass('public.push_jobs_broadcast_uidx') is not null as indice_push_jobs;
