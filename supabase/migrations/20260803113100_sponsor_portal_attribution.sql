
create table if not exists public.sponsor_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  industry text,
  default_margin_percentage numeric(5,2) not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsor_members (
  organization_id uuid not null references public.sponsor_organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'viewer' check (member_role in ('owner','campaign_manager','analyst','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.campaign_sponsors (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  organization_id uuid not null references public.sponsor_organizations(id) on delete cascade,
  approval_status text not null default 'draft' check (approval_status in ('draft','in_review','approved','changes_requested','rejected')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_budgets (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  media_budget numeric(14,2) not null default 0,
  rewards_budget numeric(14,2) not null default 0,
  other_costs numeric(14,2) not null default 0,
  estimated_margin_percentage numeric(5,2) not null default 30,
  currency text not null default 'MXN',
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_metrics_daily (
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
  primary key (campaign_id,metric_date)
);

create index if not exists sponsor_members_user_idx on public.sponsor_members(user_id,organization_id);
create index if not exists campaign_sponsors_org_idx on public.campaign_sponsors(organization_id,campaign_id);
create index if not exists metrics_campaign_date_idx on public.campaign_metrics_daily(campaign_id,metric_date desc);
create index if not exists ticket_campaign_status_date_idx on public.ticket_submissions(campaign_id,status,created_at desc);

create or replace function public.is_sponsor_member(p_organization_id uuid default null)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.sponsor_members sm
    join public.profiles p on p.id=sm.user_id
    where sm.user_id=auth.uid()
      and p.role='sponsor'
      and (p_organization_id is null or sm.organization_id=p_organization_id)
  );
$$;

create or replace function public.sponsor_owns_campaign(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.campaign_sponsors cs
    join public.sponsor_members sm on sm.organization_id=cs.organization_id
    where cs.campaign_id=p_campaign_id and sm.user_id=auth.uid()
  );
$$;

alter table public.sponsor_organizations enable row level security;
alter table public.sponsor_members enable row level security;
alter table public.campaign_sponsors enable row level security;
alter table public.campaign_budgets enable row level security;
alter table public.campaign_metrics_daily enable row level security;

create policy sponsor_org_read on public.sponsor_organizations for select using (public.is_admin() or public.is_sponsor_member(id));
create policy sponsor_members_read on public.sponsor_members for select using (public.is_admin() or user_id=auth.uid() or public.is_sponsor_member(organization_id));
create policy sponsor_links_read on public.campaign_sponsors for select using (public.is_admin() or public.is_sponsor_member(organization_id));
create policy sponsor_links_admin on public.campaign_sponsors for all using (public.is_admin()) with check (public.is_admin());
create policy sponsor_links_insert on public.campaign_sponsors for insert with check (
  public.is_sponsor_member(organization_id) and exists(select 1 from public.campaigns c where c.id=campaign_id and c.created_by=auth.uid())
);
create policy sponsor_budgets_read on public.campaign_budgets for select using (public.is_admin() or public.sponsor_owns_campaign(campaign_id));
create policy sponsor_budgets_write on public.campaign_budgets for all using (public.is_admin() or public.sponsor_owns_campaign(campaign_id)) with check (public.is_admin() or public.sponsor_owns_campaign(campaign_id));
create policy sponsor_metrics_read on public.campaign_metrics_daily for select using (public.is_admin() or public.sponsor_owns_campaign(campaign_id));

create policy sponsor_campaigns_read on public.campaigns for select using (public.sponsor_owns_campaign(id));
create policy sponsor_campaigns_insert on public.campaigns for insert with check (
  exists(select 1 from public.profiles where id=auth.uid() and role='sponsor') and created_by=auth.uid()
);
create policy sponsor_campaigns_update on public.campaigns for update using (public.sponsor_owns_campaign(id)) with check (public.sponsor_owns_campaign(id));
create policy sponsor_brand_rules_write on public.brand_rules for all using (public.sponsor_owns_campaign(campaign_id)) with check (public.sponsor_owns_campaign(campaign_id));
create policy sponsor_ticket_read on public.ticket_submissions for select using (public.sponsor_owns_campaign(campaign_id));
create policy sponsor_rewards_read on public.reward_claims for select using (public.sponsor_owns_campaign(campaign_id));
create policy sponsor_participations_read on public.participations for select using (public.sponsor_owns_campaign(campaign_id));

create or replace function public.refresh_campaign_metric_day(p_campaign_id uuid,p_metric_date date)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.campaign_metrics_daily(
    campaign_id,metric_date,ticket_uploads,valid_tickets,rejected_tickets,unique_participants,attributed_sales,rewards_won,rewards_redeemed,points_awarded,updated_at
  )
  select
    p_campaign_id,
    p_metric_date,
    count(*)::int,
    count(*) filter(where status='approved')::int,
    count(*) filter(where status in ('rejected','duplicate','outside_location'))::int,
    count(distinct user_id) filter(where status='approved')::int,
    coalesce(sum(purchase_total) filter(where status='approved'),0),
    (select count(*)::int from public.reward_claims r where r.campaign_id=p_campaign_id and r.claimed_at::date=p_metric_date),
    (select count(*)::int from public.reward_claims r where r.campaign_id=p_campaign_id and r.redeemed_at::date=p_metric_date),
    (select coalesce(sum(points_awarded),0)::bigint from public.participations p where p.campaign_id=p_campaign_id and p.completed_at::date=p_metric_date),
    now()
  from public.ticket_submissions t
  where t.campaign_id=p_campaign_id and t.created_at::date=p_metric_date
  on conflict(campaign_id,metric_date) do update set
    ticket_uploads=excluded.ticket_uploads,
    valid_tickets=excluded.valid_tickets,
    rejected_tickets=excluded.rejected_tickets,
    unique_participants=excluded.unique_participants,
    attributed_sales=excluded.attributed_sales,
    rewards_won=excluded.rewards_won,
    rewards_redeemed=excluded.rewards_redeemed,
    points_awarded=excluded.points_awarded,
    updated_at=now();
end; $$;

create or replace function public.sync_ticket_metric_day()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op in ('UPDATE','DELETE') then perform public.refresh_campaign_metric_day(old.campaign_id,old.created_at::date); end if;
  if tg_op in ('INSERT','UPDATE') then perform public.refresh_campaign_metric_day(new.campaign_id,new.created_at::date); end if;
  return coalesce(new,old);
end; $$;

drop trigger if exists ticket_metric_day_sync on public.ticket_submissions;
create trigger ticket_metric_day_sync after insert or update or delete on public.ticket_submissions
for each row execute function public.sync_ticket_metric_day();

-- Datos demo de negocio. El usuario se vincula mediante scripts/create-demo-sponsor.mjs.
insert into public.sponsor_organizations(name,slug,industry,default_margin_percentage)
values('Marca Demo Home Run','marca-demo-home-run','Alimentos y bebidas',32)
on conflict(slug) do update set name=excluded.name,industry=excluded.industry;

with org as (select id from public.sponsor_organizations where slug='marca-demo-home-run'),
creator as (select id from public.profiles where role='admin' order by created_at limit 1),
camp as (
  insert into public.campaigns(type,name,sponsor,description,status,starts_at,ends_at,participation_limit,points_on_success,created_by,metadata)
  select 'brand','Compra y gana - Marca Demo','Marca Demo Home Run','Campaña demostrativa con atribución de ventas por tickets válidos.','active',now()-interval '14 days',now()+interval '30 days',5,100,creator.id,jsonb_build_object('demoSponsor',true)
  from creator
  where not exists(select 1 from public.campaigns where metadata->>'demoSponsor'='true')
  returning id
), chosen as (
  select id from camp union all select id from public.campaigns where metadata->>'demoSponsor'='true' limit 1
)
insert into public.campaign_sponsors(campaign_id,organization_id,approval_status,approved_at)
select chosen.id,org.id,'approved',now() from chosen cross join org
on conflict(campaign_id) do update set organization_id=excluded.organization_id,approval_status='approved';

insert into public.brand_rules(campaign_id,expected_brand,minimum_total,required_products,confidence_threshold,automatic_approval)
select c.id,'Marca Demo Home Run',300,'[]'::jsonb,0.80,true from public.campaigns c where c.metadata->>'demoSponsor'='true'
on conflict(campaign_id) do update set minimum_total=excluded.minimum_total;

insert into public.campaign_budgets(campaign_id,media_budget,rewards_budget,other_costs,estimated_margin_percentage)
select c.id,35000,12000,3000,32 from public.campaigns c where c.metadata->>'demoSponsor'='true'
on conflict(campaign_id) do update set media_budget=excluded.media_budget,rewards_budget=excluded.rewards_budget,other_costs=excluded.other_costs;

insert into public.campaign_metrics_daily(campaign_id,metric_date,ticket_uploads,valid_tickets,rejected_tickets,unique_participants,attributed_sales,rewards_won,rewards_redeemed,points_awarded)
select c.id,d::date,
  35+(extract(day from d)::int%9),
  28+(extract(day from d)::int%8),
  4+(extract(day from d)::int%4),
  23+(extract(day from d)::int%7),
  (28+(extract(day from d)::int%8))*(310+(extract(day from d)::int%6)*18),
  3+(extract(day from d)::int%4),
  2+(extract(day from d)::int%3),
  (28+(extract(day from d)::int%8))*100
from public.campaigns c cross join generate_series(current_date-13,current_date,interval '1 day') d
where c.metadata->>'demoSponsor'='true'
on conflict(campaign_id,metric_date) do update set
 ticket_uploads=excluded.ticket_uploads,valid_tickets=excluded.valid_tickets,rejected_tickets=excluded.rejected_tickets,
 unique_participants=excluded.unique_participants,attributed_sales=excluded.attributed_sales,rewards_won=excluded.rewards_won,
 rewards_redeemed=excluded.rewards_redeemed,points_awarded=excluded.points_awarded;
