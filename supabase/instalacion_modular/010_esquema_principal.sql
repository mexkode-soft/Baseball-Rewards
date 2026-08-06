-- Home Run Rewards | instalación modular
-- Archivo: 010_esquema_principal.sql
-- Fuente histórica: 202608020001_home_run_rewards_schema.sql
-- Ejecutar únicamente después del archivo anterior.

-- Home Run Rewards: esquema inicial completo
create type public.app_role as enum ('admin','usuario');
create type public.campaign_type as enum ('qr','map','brand');
create type public.campaign_status as enum ('draft','scheduled','active','paused','finished');
create type public.ticket_status as enum ('pending','analyzing','approved','manual_review','rejected','duplicate','outside_location');
create type public.participation_status as enum ('started','completed','failed','blocked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role public.app_role not null default 'usuario',
  full_name text,
  avatar_url text,
  phone text,
  state text,
  municipality text,
  favorite_team text,
  total_points bigint not null default 0 check (total_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  minimum_points bigint not null default 0,
  maximum_points bigint,
  badge_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text not null default 'general',
  brand text,
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  correct_answer integer not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  type public.campaign_type not null,
  name text not null,
  sponsor text,
  description text,
  cover_url text,
  status public.campaign_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  participation_limit integer not null default 1,
  points_on_success integer not null default 0,
  points_on_failure integer not null default 0,
  passing_percentage numeric(5,2) not null default 100,
  cooldown_hours integer not null default 24,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_questions (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (campaign_id, question_id)
);

create table public.campaign_locations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  location geography(point,4326) generated always as (st_setsrid(st_makepoint(longitude,latitude),4326)::geography) stored,
  radius_meters integer not null default 15,
  reward_name text not null,
  reward_code text,
  reward_units integer not null default 1,
  points integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  token_hash text not null unique,
  display_code text not null,
  is_winner boolean not null default false,
  reward_name text,
  reward_code text,
  points integer not null default 0,
  max_uses integer not null default 1,
  total_uses integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.brand_rules (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  expected_brand text not null,
  minimum_total numeric(12,2) not null default 0,
  required_products jsonb not null default '[]'::jsonb,
  confidence_threshold numeric(4,3) not null default 0.80,
  max_images integer not null default 3,
  require_location boolean not null default true,
  automatic_approval boolean not null default true
);

create table public.brand_locations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  branch_name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  location geography(point,4326) generated always as (st_setsrid(st_makepoint(longitude,latitude),4326)::geography) stored,
  radius_meters integer not null default 150,
  is_active boolean not null default true
);

create table public.participations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid references public.campaign_locations(id),
  qr_code_id uuid references public.qr_codes(id),
  status public.participation_status not null default 'started',
  score numeric(5,2),
  points_awarded integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  cooldown_until timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  participation_id uuid references public.participations(id) on delete set null,
  points integer not null,
  transaction_type text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  participation_id uuid references public.participations(id) on delete set null,
  reward_name text not null,
  reward_code text,
  status text not null default 'active',
  expires_at timestamptz,
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create table public.ticket_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.ticket_status not null default 'pending',
  latitude double precision,
  longitude double precision,
  merchant_name text,
  branch_name text,
  ticket_number text,
  purchase_date date,
  purchase_total numeric(12,2),
  currency text default 'MXN',
  products jsonb not null default '[]'::jsonb,
  confidence numeric(4,3),
  validation_reason text,
  ai_response jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create unique index ticket_unique_folio on public.ticket_submissions(campaign_id, merchant_name, ticket_number) where ticket_number is not null;

create table public.ticket_images (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.ticket_submissions(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  brand text,
  code text,
  image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all',
  is_active boolean not null default true,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'general',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index campaigns_active_idx on public.campaigns(status, starts_at, ends_at);
create index campaign_locations_geo_idx on public.campaign_locations using gist(location);
create index brand_locations_geo_idx on public.brand_locations using gist(location);
create index participations_user_idx on public.participations(user_id, campaign_id, started_at desc);
create index points_user_idx on public.point_transactions(user_id, created_at desc);
create index claims_user_idx on public.reward_claims(user_id, claimed_at desc);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name,avatar_url)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),new.raw_user_meta_data->>'avatar_url')
  on conflict(id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.sync_profile_points() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.profiles set total_points = greatest(0,total_points + new.points), updated_at=now() where id=new.user_id;
  return new;
end; $$;
create trigger point_transaction_added after insert on public.point_transactions for each row execute procedure public.sync_profile_points();

alter table public.profiles enable row level security;
alter table public.levels enable row level security;
alter table public.questions enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_questions enable row level security;
alter table public.campaign_locations enable row level security;
alter table public.qr_codes enable row level security;
alter table public.brand_rules enable row level security;
alter table public.brand_locations enable row level security;
alter table public.participations enable row level security;
alter table public.point_transactions enable row level security;
alter table public.reward_claims enable row level security;
alter table public.ticket_submissions enable row level security;
alter table public.ticket_images enable row level security;
alter table public.promotions enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;

create policy profiles_self_read on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy public_levels_read on public.levels for select using (is_active or public.is_admin());
create policy public_questions_read on public.questions for select using (is_active or public.is_admin());
create policy public_campaigns_read on public.campaigns for select using (status='active' or public.is_admin());
create policy public_campaign_questions_read on public.campaign_questions for select using (true);
create policy public_locations_read on public.campaign_locations for select using (is_active or public.is_admin());
create policy public_brand_rules_read on public.brand_rules for select using (true);
create policy public_brand_locations_read on public.brand_locations for select using (is_active or public.is_admin());
create policy admin_questions_all on public.questions for all using (public.is_admin()) with check (public.is_admin());
create policy admin_campaigns_all on public.campaigns for all using (public.is_admin()) with check (public.is_admin());
create policy admin_campaign_questions_all on public.campaign_questions for all using (public.is_admin()) with check (public.is_admin());
create policy admin_locations_all on public.campaign_locations for all using (public.is_admin()) with check (public.is_admin());
create policy admin_qr_all on public.qr_codes for all using (public.is_admin()) with check (public.is_admin());
create policy admin_brand_rules_all on public.brand_rules for all using (public.is_admin()) with check (public.is_admin());
create policy admin_brand_locations_all on public.brand_locations for all using (public.is_admin()) with check (public.is_admin());
create policy participations_self on public.participations for select using (user_id=auth.uid() or public.is_admin());
create policy participations_insert_self on public.participations for insert with check (user_id=auth.uid());
create policy points_self on public.point_transactions for select using (user_id=auth.uid() or public.is_admin());
create policy claims_self on public.reward_claims for select using (user_id=auth.uid() or public.is_admin());
create policy tickets_self_read on public.ticket_submissions for select using (user_id=auth.uid() or public.is_admin());
create policy tickets_self_insert on public.ticket_submissions for insert with check (user_id=auth.uid());
create policy ticket_images_self on public.ticket_images for select using (exists(select 1 from public.ticket_submissions s where s.id=submission_id and (s.user_id=auth.uid() or public.is_admin())));
create policy promotions_read on public.promotions for select using (is_active or public.is_admin());
create policy promotions_admin on public.promotions for all using (public.is_admin()) with check (public.is_admin());
create policy announcements_read on public.announcements for select using (is_active or public.is_admin());
create policy announcements_admin on public.announcements for all using (public.is_admin()) with check (public.is_admin());
create policy notifications_self on public.notifications for select using (user_id=auth.uid() or public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),
      ('ticket-images','ticket-images',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy avatar_public_read on storage.objects for select using (bucket_id='avatars');
create policy avatar_owner_write on storage.objects for insert with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatar_owner_update on storage.objects for update using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy ticket_owner_write on storage.objects for insert with check (bucket_id='ticket-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy ticket_owner_read on storage.objects for select using (bucket_id='ticket-images' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

insert into public.levels(name,description,minimum_points,maximum_points,sort_order)
values ('Novato','Primer nivel',0,999,1),('All Star','Jugador destacado',1000,4999,2),('Leyenda','Máximo nivel',5000,null,3)
on conflict(name) do nothing;
