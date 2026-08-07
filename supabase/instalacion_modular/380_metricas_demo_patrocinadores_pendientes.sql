-- Home Run Rewards | métricas demo aisladas + activación real de patrocinadores
-- Archivo: 380_metricas_demo_patrocinadores_pendientes.sql
-- Ejecutar después de: 370_ajustes_operativos_geografia_push_metricas.sql
-- Idempotente.

begin;

-- ---------------------------------------------------------------------------
-- 1. Datos de invitación y activación del patrocinador.
-- La organización existe desde que se envía la invitación, pero permanece
-- inactiva hasta que el usuario abre el enlace y define su contraseña.
-- ---------------------------------------------------------------------------
alter table public.sponsor_organizations add column if not exists contact_name text;
alter table public.sponsor_organizations add column if not exists contact_email text;
alter table public.sponsor_organizations add column if not exists invited_at timestamptz;
alter table public.sponsor_organizations add column if not exists activated_at timestamptz;

create index if not exists sponsor_organizations_contact_email_idx
  on public.sponsor_organizations(lower(contact_email))
  where contact_email is not null;

-- Organizaciones antiguas ya activas se consideran activadas para conservar
-- el comportamiento existente y permitir que el administrador las edite.
update public.sponsor_organizations
set activated_at = coalesce(activated_at, created_at, now()),
    invited_at = coalesce(invited_at, created_at, now())
where is_active = true
  and activated_at is null;

-- ---------------------------------------------------------------------------
-- 2. Métricas demo separadas de las métricas reales.
-- Nunca se mezclan con campaign_metrics_daily.
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_metrics_demo_daily (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  metric_date date not null,
  ticket_uploads integer not null default 0,
  valid_tickets integer not null default 0,
  rejected_tickets integer not null default 0,
  unique_participants integer not null default 0,
  attributed_sales numeric(14,2) not null default 0,
  rewards_won integer not null default 0,
  rewards_redeemed integer not null default 0,
  points_awarded bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, metric_date)
);

create index if not exists campaign_metrics_demo_date_idx
  on public.campaign_metrics_demo_daily(campaign_id, metric_date desc);

alter table public.campaign_metrics_demo_daily enable row level security;

drop policy if exists "admin consulta metricas demo" on public.campaign_metrics_demo_daily;
create policy "admin consulta metricas demo"
on public.campaign_metrics_demo_daily
for select
to authenticated
using (public.is_admin());

grant select on public.campaign_metrics_demo_daily to authenticated;
grant all on public.campaign_metrics_demo_daily to service_role;

-- ---------------------------------------------------------------------------
-- 3. Retirar únicamente filas que coincidan exactamente con el patrón de la
-- simulación anterior. Así al apagar Demo no quedan cifras ficticias en real.
-- ---------------------------------------------------------------------------
delete from public.campaign_metrics_daily m
where m.metric_date >= current_date - 90
  and m.ticket_uploads = 45 + ((extract(day from m.metric_date)::int * 7) % 55)
  and m.valid_tickets = 36 + ((extract(day from m.metric_date)::int * 5) % 44)
  and m.rejected_tickets = 3 + ((extract(day from m.metric_date)::int * 3) % 10)
  and m.unique_participants = 28 + ((extract(day from m.metric_date)::int * 11) % 48)
  and m.attributed_sales = 4800 + ((extract(day from m.metric_date)::int * 1739) % 16500)
  and m.rewards_won = 4 + ((extract(day from m.metric_date)::int * 2) % 13)
  and m.rewards_redeemed = 2 + ((extract(day from m.metric_date)::int * 3) % 9)
  and m.points_awarded = 900 + ((extract(day from m.metric_date)::int * 137) % 3200);

-- ---------------------------------------------------------------------------
-- 4. Simulador de 30 días. Escribe exclusivamente en la tabla demo.
-- ---------------------------------------------------------------------------
create or replace function public.simular_metricas_campana(p_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_rows integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select coalesce((value->>'simulatedLocationEnabled')::boolean, false)
    into v_enabled
  from public.app_settings
  where key = 'demo';

  if not v_enabled then raise exception 'DEMO_LOCATION_REQUIRED'; end if;
  if not exists(select 1 from public.campaigns where id = p_campaign_id) then raise exception 'CAMPAIGN_NOT_FOUND'; end if;

  delete from public.campaign_metrics_demo_daily
  where campaign_id = p_campaign_id;

  insert into public.campaign_metrics_demo_daily(
    campaign_id, metric_date, ticket_uploads, valid_tickets, rejected_tickets,
    unique_participants, attributed_sales, rewards_won, rewards_redeemed,
    points_awarded, updated_at
  )
  select
    p_campaign_id,
    d::date,
    45 + ((extract(day from d)::int * 7) % 55),
    36 + ((extract(day from d)::int * 5) % 44),
    3 + ((extract(day from d)::int * 3) % 10),
    28 + ((extract(day from d)::int * 11) % 48),
    4800 + ((extract(day from d)::int * 1739) % 16500),
    4 + ((extract(day from d)::int * 2) % 13),
    2 + ((extract(day from d)::int * 3) % 9),
    900 + ((extract(day from d)::int * 137) % 3200),
    now()
  from generate_series(current_date - interval '29 days', current_date, interval '1 day') d
  on conflict (campaign_id, metric_date) do update set
    ticket_uploads = excluded.ticket_uploads,
    valid_tickets = excluded.valid_tickets,
    rejected_tickets = excluded.rejected_tickets,
    unique_participants = excluded.unique_participants,
    attributed_sales = excluded.attributed_sales,
    rewards_won = excluded.rewards_won,
    rewards_redeemed = excluded.rewards_redeemed,
    points_awarded = excluded.points_awarded,
    updated_at = now();

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

alter function public.simular_metricas_campana(uuid) owner to postgres;
revoke all on function public.simular_metricas_campana(uuid) from public;
grant execute on function public.simular_metricas_campana(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
commit;

-- Verificación rápida
select column_name
from information_schema.columns
where table_schema='public'
  and table_name='sponsor_organizations'
  and column_name in ('contact_name','contact_email','invited_at','activated_at')
order by column_name;

select to_regclass('public.campaign_metrics_demo_daily') as tabla_metricas_demo;
