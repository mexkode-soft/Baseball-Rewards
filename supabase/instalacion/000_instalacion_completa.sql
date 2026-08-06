
-- ===== 202608020001_home_run_rewards_schema.sql =====
-- Home Run Rewards: esquema inicial completo
create extension if not exists pgcrypto;
create extension if not exists postgis;

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


-- ===== 202608020002_real_data_connections.sql =====
-- Home Run Rewards: conexiones reales, RPCs seguras y ajustes de RLS
alter table public.campaigns add column if not exists metadata jsonb not null default '{}'::jsonb;
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy app_settings_admin_all on public.app_settings for all using (public.is_admin()) with check (public.is_admin());
create policy app_settings_authenticated_read on public.app_settings for select to authenticated using (true);

-- Permisos administrativos faltantes.
create policy admin_levels_all on public.levels for all using (public.is_admin()) with check (public.is_admin());
create policy admin_profiles_read on public.profiles for select using (public.is_admin());
create policy admin_participations_read on public.participations for select using (public.is_admin());
create policy admin_points_read on public.point_transactions for select using (public.is_admin());
create policy admin_claims_read on public.reward_claims for select using (public.is_admin());
create policy ticket_images_insert_owner on public.ticket_images for insert with check (
  exists(select 1 from public.ticket_submissions s where s.id=submission_id and s.user_id=auth.uid())
);
create policy ticket_submissions_update_owner on public.ticket_submissions for update using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
create policy notifications_update_self on public.notifications for update using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Los usuarios pueden leer metadatos no sensibles de QR activos, pero nunca el hash.
create or replace view public.active_qr_campaign_summary as
select c.id,c.name,c.sponsor,c.description,c.cover_url,c.status,c.starts_at,c.ends_at,c.participation_limit,
       c.points_on_success,c.points_on_failure,c.created_at,
       count(q.id)::int as code_count
from public.campaigns c
left join public.qr_codes q on q.campaign_id=c.id and q.is_active
where c.type='qr'
group by c.id;
grant select on public.active_qr_campaign_summary to authenticated;

create or replace function public.scan_qr(p_campaign_id uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.campaigns%rowtype;
  v_code public.qr_codes%rowtype;
  v_count integer;
  v_participation uuid;
  v_points integer;
  v_reward text;
  v_reward_code text;
begin
  if v_user is null then
    return jsonb_build_object('ok',false,'status','unauthorized','message','Inicia sesión para participar.');
  end if;

  select * into v_campaign from public.campaigns
  where id=p_campaign_id and type='qr';
  if not found then
    return jsonb_build_object('ok',false,'status','invalid','message','Campaña no encontrada.');
  end if;
  if v_campaign.status <> 'active' or (v_campaign.starts_at is not null and now() < v_campaign.starts_at)
     or (v_campaign.ends_at is not null and now() > v_campaign.ends_at) then
    return jsonb_build_object('ok',false,'status','inactive','message','La campaña no está activa.');
  end if;

  select * into v_code from public.qr_codes
  where campaign_id=p_campaign_id
    and token_hash=encode(digest(p_token,'sha256'),'hex')
    and is_active;
  if not found then
    return jsonb_build_object('ok',false,'status','invalid','message','El QR no es válido para esta campaña.');
  end if;

  if exists(select 1 from public.participations where user_id=v_user and campaign_id=p_campaign_id and qr_code_id=v_code.id) then
    return jsonb_build_object('ok',false,'status','duplicate','message','Ya escaneaste este código. Busca otro para seguir participando.');
  end if;

  select count(*) into v_count from public.participations
  where user_id=v_user and campaign_id=p_campaign_id and qr_code_id is not null;
  if v_count >= greatest(1,v_campaign.participation_limit) then
    return jsonb_build_object('ok',false,'status','limit_reached','message','Ya alcanzaste el límite de intentos de esta campaña.');
  end if;
  if v_code.total_uses >= v_code.max_uses then
    return jsonb_build_object('ok',false,'status','invalid','message','Este código ya alcanzó su límite de usos.');
  end if;

  v_points := v_code.points;
  v_reward := case when v_code.is_winner then coalesce(v_code.reward_name,'Premio') else null end;
  v_reward_code := case when v_code.is_winner then v_code.reward_code else null end;

  insert into public.participations(campaign_id,user_id,qr_code_id,status,points_awarded,completed_at,metadata)
  values(p_campaign_id,v_user,v_code.id,'completed',v_points,now(),jsonb_build_object('display_code',v_code.display_code,'winner',v_code.is_winner))
  returning id into v_participation;

  update public.qr_codes set total_uses=total_uses+1 where id=v_code.id;
  if v_points <> 0 then
    insert into public.point_transactions(user_id,campaign_id,participation_id,points,transaction_type,description)
    values(v_user,p_campaign_id,v_participation,v_points,'qr_scan','Escaneo '||v_code.display_code);
  end if;
  if v_code.is_winner then
    insert into public.reward_claims(user_id,campaign_id,participation_id,reward_name,reward_code)
    values(v_user,p_campaign_id,v_participation,v_reward,v_reward_code);
  end if;

  return jsonb_build_object(
    'ok',true,
    'status',case when v_code.is_winner then 'winner' else 'not_winner' end,
    'message',case when v_code.is_winner then '¡Felicidades! Ganaste '||v_reward||'.' else 'Este código no contiene premio. Sigue participando.' end,
    'pointsAwarded',v_points,
    'code',jsonb_build_object('id',v_code.id,'label',v_code.display_code,'isWinner',v_code.is_winner,'reward',coalesce(v_reward,''),'rewardCode',coalesce(v_reward_code,''),'points',v_points)
  );
end;
$$;
grant execute on function public.scan_qr(uuid,text) to authenticated;

create or replace function public.complete_dynamic_reward(
  p_campaign_id uuid,
  p_location_id uuid default null,
  p_score numeric default 100,
  p_success boolean default true,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.campaigns%rowtype;
  v_location public.campaign_locations%rowtype;
  v_last timestamptz;
  v_participation uuid;
  v_points integer;
  v_reward text;
  v_code text;
begin
  if v_user is null then raise exception 'No autenticado'; end if;
  select * into v_campaign from public.campaigns where id=p_campaign_id and type in ('map','brand');
  if not found then raise exception 'Campaña no encontrada'; end if;
  if v_campaign.status <> 'active' then raise exception 'Campaña inactiva'; end if;

  if p_location_id is not null then
    select * into v_location from public.campaign_locations where id=p_location_id and campaign_id=p_campaign_id and is_active;
    if not found then raise exception 'Ubicación no encontrada'; end if;
  end if;

  select max(coalesce(cooldown_until,completed_at)) into v_last
  from public.participations where user_id=v_user and campaign_id=p_campaign_id
    and (p_location_id is null or location_id=p_location_id) and status in ('completed','failed','blocked');
  if v_last is not null and v_last > now() then
    return jsonb_build_object('ok',false,'status','blocked','cooldownUntil',v_last,'message','Debes esperar para volver a participar.');
  end if;

  v_points := case when p_success then coalesce(v_location.points,v_campaign.points_on_success) else v_campaign.points_on_failure end;
  v_reward := case when p_success then coalesce(v_location.reward_name,v_campaign.metadata->>'reward',v_campaign.name) else null end;
  v_code := case when p_success then coalesce(v_location.reward_code,v_campaign.metadata->>'rewardCode') else null end;

  insert into public.participations(campaign_id,user_id,location_id,status,score,points_awarded,completed_at,cooldown_until,metadata)
  values(p_campaign_id,v_user,p_location_id,case when p_success then 'completed' else 'failed' end,p_score,v_points,now(),
    case when p_success then null else now()+make_interval(hours=>v_campaign.cooldown_hours) end,p_metadata)
  returning id into v_participation;

  if p_success and p_location_id is not null and v_location.reward_units > 0 then
    update public.campaign_locations set reward_units=greatest(0,reward_units-1) where id=p_location_id;
  end if;
  if v_points <> 0 then
    insert into public.point_transactions(user_id,campaign_id,participation_id,points,transaction_type,description)
    values(v_user,p_campaign_id,v_participation,v_points,case when p_success then 'campaign_reward' else 'campaign_failure' end,v_campaign.name);
  end if;
  if p_success and v_reward is not null then
    insert into public.reward_claims(user_id,campaign_id,participation_id,reward_name,reward_code)
    values(v_user,p_campaign_id,v_participation,v_reward,v_code);
  end if;

  return jsonb_build_object('ok',true,'status',case when p_success then 'completed' else 'failed' end,'participationId',v_participation,'pointsAwarded',v_points,'reward',v_reward,'rewardCode',v_code);
end;
$$;
grant execute on function public.complete_dynamic_reward(uuid,uuid,numeric,boolean,jsonb) to authenticated;

-- Avatar de Google: algunos proveedores usan picture en lugar de avatar_url.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name,avatar_url)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture')
  )
  on conflict(id) do update set
    email=excluded.email,
    full_name=coalesce(public.profiles.full_name,excluded.full_name),
    avatar_url=coalesce(public.profiles.avatar_url,excluded.avatar_url),
    updated_at=now();
  return new;
end; $$;

insert into public.app_settings(key,value)
values('demo',jsonb_build_object('simulatedLocationEnabled',false,'simulatedLatitude',19.432608,'simulatedLongitude',-99.133209,'enable24HourCooldown',true))
on conflict(key) do nothing;

create or replace function public.reset_demo_progress()
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  delete from public.ticket_images;
  delete from public.ticket_submissions;
  delete from public.reward_claims;
  delete from public.point_transactions;
  delete from public.participations;
  update public.profiles set total_points=0, updated_at=now();
  update public.qr_codes set total_uses=0;
end;
$$;
grant execute on function public.reset_demo_progress() to authenticated;

alter table public.promotions add column if not exists metadata jsonb not null default '{}'::jsonb;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('promotion-images','promotion-images',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy promotion_images_public_read on storage.objects for select using (bucket_id='promotion-images');
create policy promotion_images_admin_insert on storage.objects for insert with check (bucket_id='promotion-images' and public.is_admin());
create policy promotion_images_admin_update on storage.objects for update using (bucket_id='promotion-images' and public.is_admin()) with check (bucket_id='promotion-images' and public.is_admin());
create policy promotion_images_admin_delete on storage.objects for delete using (bucket_id='promotion-images' and public.is_admin());

create or replace view public.ranking_view as
select p.id,p.full_name,p.avatar_url,p.state,p.total_points,
       coalesce((select l.name from public.levels l where l.is_active and p.total_points >= l.minimum_points and (l.maximum_points is null or p.total_points <= l.maximum_points) order by l.minimum_points desc limit 1),'Novato') as level
from public.profiles p
where p.role='usuario'
order by p.total_points desc;
grant select on public.ranking_view to authenticated;

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  message_type text not null default 'information',
  priority text not null default 'normal',
  audience jsonb not null default '{"type":"all"}'::jsonb,
  status text not null default 'sent',
  recipient_count integer not null default 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.broadcasts enable row level security;
create policy broadcasts_admin_all on public.broadcasts for all using (public.is_admin()) with check (public.is_admin());
create policy notifications_admin_all on public.notifications for all using (public.is_admin()) with check (public.is_admin());

-- Evita que un usuario se asigne rol o puntos desde el navegador.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    new.role := old.role;
    new.total_points := old.total_points;
    new.email := old.email;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists protect_profile_fields_trigger on public.profiles;
create trigger protect_profile_fields_trigger before update on public.profiles
for each row execute function public.protect_profile_fields();

-- La vista pública de QR solo expone campañas realmente activas.
create or replace view public.active_qr_campaign_summary as
select c.id,c.name,c.sponsor,c.description,c.cover_url,c.status,c.starts_at,c.ends_at,c.participation_limit,
       c.points_on_success,c.points_on_failure,c.created_at,
       count(q.id)::int as code_count
from public.campaigns c
left join public.qr_codes q on q.campaign_id=c.id and q.is_active
where c.type='qr'
  and c.status='active'
  and (c.starts_at is null or c.starts_at <= now())
  and (c.ends_at is null or c.ends_at >= now())
group by c.id;
grant select on public.active_qr_campaign_summary to authenticated;

-- Datos base para que el panel arranque con contenido real.
insert into public.questions(text,category,brand,answers,correct_answer,is_active)
select * from (values
  ('¿Cuántos strikes provocan un ponche?','baseball',null,'["Dos","Tres","Cuatro"]'::jsonb,1,true),
  ('¿Cuántas bases tiene un campo de béisbol?','baseball',null,'["Tres","Cuatro","Cinco"]'::jsonb,1,true),
  ('¿Cuántos outs terminan una media entrada?','baseball',null,'["Dos","Tres","Cuatro"]'::jsonb,1,true),
  ('¿Cuál es la capital de México?','general',null,'["Monterrey","Guadalajara","Ciudad de México"]'::jsonb,2,true),
  ('¿Qué experiencia ofrece Home Run Rewards?','marca','Home Run Rewards','["Campañas interactivas","Venta de autos","Cursos"]'::jsonb,0,true)
) as seed(text,category,brand,answers,correct_answer,is_active)
where not exists(select 1 from public.questions);

insert into public.announcements(title,body,audience,is_active,published_at)
select * from (values
  ('Promoción especial','{"text":"2x1 en el partido Águilas vs. Tomateros","icon":"ticket","order":1}','all',true,now()),
  ('Premios sorpresa','{"text":"Premios sorpresa durante el encuentro","icon":"gift","order":2}','all',true,now()),
  ('Sube en el ranking','{"text":"Participa y sube en el ranking","icon":"trophy","order":3}','all',true,now())
) as seed(title,body,audience,is_active,published_at)
where not exists(select 1 from public.announcements);

insert into public.promotions(title,description,brand,code,image_url,starts_at,ends_at,is_active,metadata)
select '2x1 en el partido Águilas vs. Tomateros','Presenta esta promoción y recibe dos accesos al precio de uno.','Home Run Rewards','HOMERUN2X1','/images/logo-home-run.png',now(),now()+interval '30 days',true,
       '{"brandImage":"/images/logo-home-run.png","productImages":["/images/logo-home-run.png"]}'::jsonb
where not exists(select 1 from public.promotions);


-- ===== 202608020003_seasons_campaign_management.sql =====
-- Home Run Rewards: temporadas, ranking histórico y gestión de campañas
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at date not null,
  ends_at date not null,
  status text not null default 'draft' check (status in ('draft','active','closed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_valid_dates check (ends_at >= starts_at)
);

create unique index if not exists one_active_season_idx
on public.seasons ((status)) where status='active';

alter table public.point_transactions
  add column if not exists season_id uuid references public.seasons(id) on delete set null;

create index if not exists point_transactions_season_user_idx
on public.point_transactions(season_id,user_id,created_at desc);

create or replace function public.active_season_id()
returns uuid language sql stable security definer set search_path=public as $$
  select id from public.seasons
  where status='active' and current_date between starts_at and ends_at
  order by starts_at desc limit 1
$$;

grant execute on function public.active_season_id() to authenticated;

create or replace function public.assign_point_transaction_season()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.season_id is null then
    new.season_id := public.active_season_id();
  end if;
  return new;
end;
$$;

drop trigger if exists set_point_transaction_season on public.point_transactions;
create trigger set_point_transaction_season
before insert on public.point_transactions
for each row execute function public.assign_point_transaction_season();

create or replace view public.season_ranking_view as
with totals as (
  select s.id as season_id,s.name as season_name,s.starts_at,s.ends_at,s.status as season_status,
         p.id,p.full_name,p.avatar_url,p.state,coalesce(sum(pt.points),0)::bigint as season_points
  from public.seasons s
  cross join public.profiles p
  left join public.point_transactions pt on pt.user_id=p.id and pt.season_id=s.id
  where p.role='usuario'
  group by s.id,s.name,s.starts_at,s.ends_at,s.status,p.id,p.full_name,p.avatar_url,p.state
)
select t.*,coalesce(l.name,'Novato') as level
from totals t
left join lateral (
  select name from public.levels
  where is_active and t.season_points >= minimum_points
    and (maximum_points is null or t.season_points <= maximum_points)
  order by minimum_points desc limit 1
) l on true;

grant select on public.seasons to authenticated;
grant select on public.season_ranking_view to authenticated;

alter table public.seasons enable row level security;
drop policy if exists seasons_authenticated_read on public.seasons;
create policy seasons_authenticated_read on public.seasons for select to authenticated using (true);
drop policy if exists seasons_admin_all on public.seasons;
create policy seasons_admin_all on public.seasons for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.activate_season(p_season_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  update public.seasons set status='closed',updated_at=now() where status='active' and id<>p_season_id;
  update public.seasons set status='active',updated_at=now() where id=p_season_id;
end;
$$;
grant execute on function public.activate_season(uuid) to authenticated;

-- Primera temporada de ejemplo solo si aún no existe ninguna.
insert into public.seasons(name,starts_at,ends_at,status)
select 'Temporada 2026', date '2026-08-01', date '2026-12-31', 'active'
where not exists(select 1 from public.seasons);

-- Asigna movimientos históricos a la temporada que cubre su fecha.
update public.point_transactions pt
set season_id=s.id
from public.seasons s
where pt.season_id is null
  and pt.created_at::date between s.starts_at and s.ends_at;

-- Bucket público para portadas de campañas.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('campaign-images','campaign-images',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

drop policy if exists campaign_images_public_read on storage.objects;
create policy campaign_images_public_read on storage.objects for select using (bucket_id='campaign-images');
drop policy if exists campaign_images_admin_insert on storage.objects;
create policy campaign_images_admin_insert on storage.objects for insert with check (bucket_id='campaign-images' and public.is_admin());
drop policy if exists campaign_images_admin_update on storage.objects;
create policy campaign_images_admin_update on storage.objects for update using (bucket_id='campaign-images' and public.is_admin()) with check (bucket_id='campaign-images' and public.is_admin());
drop policy if exists campaign_images_admin_delete on storage.objects;
create policy campaign_images_admin_delete on storage.objects for delete using (bucket_id='campaign-images' and public.is_admin());


-- ===== 202608020004_fix_profiles_auth_sync.sql =====
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
      split_part(
        coalesce(new.email, 'usuario'),
        '@',
        1
      )
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    'usuario'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(
      nullif(public.profiles.full_name, ''),
      excluded.full_name
    ),
    avatar_url = coalesce(
      public.profiles.avatar_url,
      excluded.avatar_url
    ),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert or update of raw_user_meta_data, email
on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles
enable row level security;

drop policy if exists
  "Usuarios consultan su perfil"
on public.profiles;

drop policy if exists
  "Usuarios actualizan su perfil"
on public.profiles;

drop policy if exists
  "Usuarios insertan su perfil"
on public.profiles;

create policy
  "Usuarios consultan su perfil"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

create policy
  "Usuarios actualizan su perfil"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);

create policy
  "Usuarios insertan su perfil"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'usuario'
);

insert into public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  role
)
select
  id,
  coalesce(email, ''),
  coalesce(
    raw_user_meta_data ->> 'full_name',
    raw_user_meta_data ->> 'name',
    split_part(
      coalesce(email, 'usuario'),
      '@',
      1
    )
  ),
  coalesce(
    raw_user_meta_data ->> 'avatar_url',
    raw_user_meta_data ->> 'picture'
  ),
  'usuario'
from auth.users
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  avatar_url = coalesce(
    public.profiles.avatar_url,
    excluded.avatar_url
  );

-- ===== 202608020005_qr_tokens_demo_brand_flow.sql =====
-- Conserva el token público necesario para volver a descargar exactamente
-- los mismos códigos QR al editar una campaña.
alter table public.qr_codes
  add column if not exists token_value text;

create index if not exists qr_codes_campaign_token_value_idx
  on public.qr_codes (campaign_id, token_value);

comment on column public.qr_codes.token_value is
  'Token público embebido en el QR. No sustituye token_hash; permite regenerar el mismo material al editar.';


-- ===== 20260802221000_fix_scan_qr_digest.sql =====
create or replace function public.scan_qr(
  p_campaign_id uuid,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path to public, extensions
as $function$
declare
  v_user uuid := auth.uid();
  v_campaign public.campaigns%rowtype;
  v_code public.qr_codes%rowtype;
  v_count integer;
  v_participation uuid;
  v_points integer;
  v_reward text;
  v_reward_code text;
begin
  if v_user is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'unauthorized',
      'message', 'Inicia sesión para participar.'
    );
  end if;

  select *
  into v_campaign
  from public.campaigns
  where id = p_campaign_id
    and type = 'qr';

  if not found then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid',
      'message', 'Campaña no encontrada.'
    );
  end if;

  if v_campaign.status <> 'active'
    or (
      v_campaign.starts_at is not null
      and now() < v_campaign.starts_at
    )
    or (
      v_campaign.ends_at is not null
      and now() > v_campaign.ends_at
    )
  then
    return jsonb_build_object(
      'ok', false,
      'status', 'inactive',
      'message', 'La campaña no está activa.'
    );
  end if;

  select *
  into v_code
  from public.qr_codes
  where campaign_id = p_campaign_id
    and token_hash = encode(
      extensions.digest(
        p_token::text,
        'sha256'::text
      ),
      'hex'
    )
    and is_active = true;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid',
      'message', 'El QR no es válido para esta campaña.'
    );
  end if;

  if exists (
    select 1
    from public.participations
    where user_id = v_user
      and campaign_id = p_campaign_id
      and qr_code_id = v_code.id
  ) then
    return jsonb_build_object(
      'ok', false,
      'status', 'duplicate',
      'message', 'Ya escaneaste este código. Busca otro para seguir participando.'
    );
  end if;

  select count(*)
  into v_count
  from public.participations
  where user_id = v_user
    and campaign_id = p_campaign_id
    and qr_code_id is not null;

  if v_count >= greatest(
    1,
    coalesce(
      v_campaign.participation_limit,
      1
    )
  ) then
    return jsonb_build_object(
      'ok', false,
      'status', 'limit_reached',
      'message', 'Ya alcanzaste el límite de intentos de esta campaña.'
    );
  end if;

  if v_code.total_uses >= v_code.max_uses then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid',
      'message', 'Este código ya alcanzó su límite de usos.'
    );
  end if;

  v_points := coalesce(
    v_code.points,
    0
  );

  v_reward :=
    case
      when v_code.is_winner then
        coalesce(
          v_code.reward_name,
          'Premio'
        )
      else null
    end;

  v_reward_code :=
    case
      when v_code.is_winner then
        v_code.reward_code
      else null
    end;

  insert into public.participations (
    campaign_id,
    user_id,
    qr_code_id,
    status,
    points_awarded,
    completed_at,
    metadata
  )
  values (
    p_campaign_id,
    v_user,
    v_code.id,
    'completed',
    v_points,
    now(),
    jsonb_build_object(
      'display_code',
      v_code.display_code,
      'winner',
      v_code.is_winner
    )
  )
  returning id
  into v_participation;

  update public.qr_codes
  set total_uses =
    coalesce(
      total_uses,
      0
    ) + 1
  where id = v_code.id;

  if v_points <> 0 then
    insert into public.point_transactions (
      user_id,
      campaign_id,
      participation_id,
      points,
      transaction_type,
      description
    )
    values (
      v_user,
      p_campaign_id,
      v_participation,
      v_points,
      'qr_scan',
      'Escaneo ' ||
        v_code.display_code
    );
  end if;

  if v_code.is_winner then
    insert into public.reward_claims (
      user_id,
      campaign_id,
      participation_id,
      reward_name,
      reward_code
    )
    values (
      v_user,
      p_campaign_id,
      v_participation,
      v_reward,
      v_reward_code
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status',
      case
        when v_code.is_winner then
          'winner'
        else
          'not_winner'
      end,
    'message',
      case
        when v_code.is_winner then
          '¡Felicidades! Ganaste ' ||
          v_reward ||
          '.'
        else
          'Este código no contiene premio. Sigue participando.'
      end,
    'pointsAwarded',
      v_points,
    'code',
      jsonb_build_object(
        'id',
          v_code.id,
        'label',
          v_code.display_code,
        'isWinner',
          v_code.is_winner,
        'reward',
          coalesce(
            v_reward,
            ''
          ),
        'rewardCode',
          coalesce(
            v_reward_code,
            ''
          ),
        'points',
          v_points
      )
  );
end;
$function$;

-- ===== 20260802233000_recovery_rewards_performance_pwa.sql =====
-- Punto de recuperación funcional 1: recompensas, limpieza segura e índices de rendimiento.

create index if not exists campaigns_active_type_dates_idx
on public.campaigns(type, status, starts_at, ends_at, created_at desc);

create index if not exists qr_codes_campaign_active_idx
on public.qr_codes(campaign_id, is_active, created_at);

create index if not exists participations_user_completed_idx
on public.participations(user_id, status, completed_at desc);

create index if not exists participations_user_campaign_qr_idx
on public.participations(user_id, campaign_id, qr_code_id)
where qr_code_id is not null;

create index if not exists reward_claims_user_campaign_idx
on public.reward_claims(user_id, campaign_id, claimed_at desc);

create or replace function public.get_my_rewards_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with current_user_profile as (
    select p.id, p.total_points
    from public.profiles p
    where p.id = auth.uid()
  ),
  capture_totals as (
    select count(*)::bigint as captures
    from public.participations p
    where p.user_id = auth.uid()
      and p.status = 'completed'
  ),
  prize_totals as (
    select count(*)::bigint as prizes
    from public.reward_claims r
    where r.user_id = auth.uid()
  ),
  reward_items as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'campaignId', r.campaign_id,
          'campaignName', c.name,
          'campaignType', c.type,
          'rewardName', r.reward_name,
          'rewardCode', coalesce(r.reward_code, ''),
          'points', coalesce(p.points_awarded, 0),
          'claimedAt', r.claimed_at
        ) order by r.claimed_at desc
      ),
      '[]'::jsonb
    ) as items
    from public.reward_claims r
    join public.campaigns c on c.id = r.campaign_id
    left join public.participations p on p.id = r.participation_id
    where r.user_id = auth.uid()
  )
  select jsonb_build_object(
    'points', coalesce((select total_points from current_user_profile), 0),
    'captures', coalesce((select captures from capture_totals), 0),
    'prizes', coalesce((select prizes from prize_totals), 0),
    'items', coalesce((select items from reward_items), '[]'::jsonb)
  );
$$;

grant execute on function public.get_my_rewards_dashboard() to authenticated;

-- Reinicia únicamente el progreso del usuario autenticado.
-- Evita borrar por accidente la información de todos los participantes.
create or replace function public.reset_demo_progress()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión';
  end if;

  delete from public.ticket_images
  where submission_id in (
    select id from public.ticket_submissions where user_id = v_user
  );

  delete from public.ticket_submissions where user_id = v_user;
  delete from public.reward_claims where user_id = v_user;
  delete from public.point_transactions where user_id = v_user;
  delete from public.participations where user_id = v_user;

  update public.profiles
  set total_points = 0, updated_at = now()
  where id = v_user;

  update public.qr_codes q
  set total_uses = usage_totals.total_uses
  from (
    select q2.id, count(p.id)::integer as total_uses
    from public.qr_codes q2
    left join public.participations p on p.qr_code_id = q2.id
    group by q2.id
  ) usage_totals
  where q.id = usage_totals.id;
end;
$$;

grant execute on function public.reset_demo_progress() to authenticated;


-- ===== 20260803050000_fix_rewards_totals_and_pwa.sql =====
-- Punto de ajuste: sincroniza puntos reales y consolida premios del usuario.

create or replace function public.sync_profile_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_user uuid;
  v_new_user uuid;
begin
  v_old_user := case when tg_op in ('UPDATE', 'DELETE') then old.user_id else null end;
  v_new_user := case when tg_op in ('INSERT', 'UPDATE') then new.user_id else null end;

  if v_old_user is not null then
    update public.profiles p
    set total_points = greatest(
          0,
          coalesce((
            select sum(pt.points)
            from public.point_transactions pt
            where pt.user_id = v_old_user
          ), 0)
        ),
        updated_at = now()
    where p.id = v_old_user;
  end if;

  if v_new_user is not null and v_new_user is distinct from v_old_user then
    update public.profiles p
    set total_points = greatest(
          0,
          coalesce((
            select sum(pt.points)
            from public.point_transactions pt
            where pt.user_id = v_new_user
          ), 0)
        ),
        updated_at = now()
    where p.id = v_new_user;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists point_transaction_added on public.point_transactions;
drop trigger if exists point_transactions_sync_profile_points on public.point_transactions;

create trigger point_transactions_sync_profile_points
after insert or update or delete on public.point_transactions
for each row execute function public.sync_profile_points();

-- Corrige saldos históricos que pudieron quedar desfasados.
update public.profiles p
set total_points = greatest(
      0,
      coalesce((
        select sum(pt.points)
        from public.point_transactions pt
        where pt.user_id = p.id
      ), 0)
    ),
    updated_at = now();

create or replace function public.get_my_rewards_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with my_points as (
    select coalesce(sum(pt.points), 0)::bigint as points
    from public.point_transactions pt
    where pt.user_id = auth.uid()
  ),
  capture_totals as (
    select count(*)::bigint as captures
    from public.participations p
    where p.user_id = auth.uid()
      and p.status = 'completed'
  ),
  claimed_rewards as (
    select
      r.id,
      r.campaign_id,
      c.name as campaign_name,
      c.type::text as campaign_type,
      r.reward_name,
      coalesce(r.reward_code, '') as reward_code,
      coalesce(p.points_awarded, 0) as points,
      r.claimed_at
    from public.reward_claims r
    join public.campaigns c on c.id = r.campaign_id
    left join public.participations p on p.id = r.participation_id
    where r.user_id = auth.uid()
  ),
  qr_wins_without_claim as (
    select
      p.id,
      p.campaign_id,
      c.name as campaign_name,
      c.type::text as campaign_type,
      coalesce(q.reward_name, 'Premio') as reward_name,
      coalesce(q.reward_code, '') as reward_code,
      coalesce(p.points_awarded, 0) as points,
      coalesce(p.completed_at, p.started_at) as claimed_at
    from public.participations p
    join public.campaigns c on c.id = p.campaign_id
    join public.qr_codes q on q.id = p.qr_code_id and q.is_winner = true
    where p.user_id = auth.uid()
      and p.status = 'completed'
      and not exists (
        select 1
        from public.reward_claims r
        where r.user_id = p.user_id
          and r.participation_id = p.id
      )
  ),
  all_rewards as (
    select * from claimed_rewards
    union all
    select * from qr_wins_without_claim
  ),
  reward_summary as (
    select
      count(*)::bigint as prizes,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'campaignId', campaign_id,
            'campaignName', campaign_name,
            'campaignType', campaign_type,
            'rewardName', reward_name,
            'rewardCode', reward_code,
            'points', points,
            'claimedAt', claimed_at
          ) order by claimed_at desc
        ),
        '[]'::jsonb
      ) as items
    from all_rewards
  )
  select jsonb_build_object(
    'points', coalesce((select points from my_points), 0),
    'captures', coalesce((select captures from capture_totals), 0),
    'prizes', coalesce((select prizes from reward_summary), 0),
    'items', coalesce((select items from reward_summary), '[]'::jsonb)
  );
$$;

grant execute on function public.get_my_rewards_dashboard() to authenticated;


-- ===== 20260803083000_push_notifications_queue.sql =====
-- Home Run Rewards: inbox web + suscripciones push + cola escalable.
create extension if not exists pgcrypto;

alter table public.notifications add column if not exists broadcast_id uuid references public.broadcasts(id) on delete cascade;
alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists image_url text;

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);
create index if not exists notifications_broadcast_idx on public.notifications(broadcast_id, created_at, id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  is_active boolean not null default true,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create index if not exists push_subscriptions_active_user_idx on public.push_subscriptions(user_id) where is_active;

create table if not exists public.push_jobs (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  processed_count integer not null default 0,
  delivered_count integer not null default 0,
  failed_count integer not null default 0,
  batch_size integer not null default 250 check (batch_size between 1 and 1000),
  attempts integer not null default 0,
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(broadcast_id)
);

create index if not exists push_jobs_pending_idx on public.push_jobs(status, created_at) where status in ('pending','processing');

alter table public.push_subscriptions enable row level security;
alter table public.push_jobs enable row level security;

drop policy if exists push_subscriptions_self_select on public.push_subscriptions;
create policy push_subscriptions_self_select on public.push_subscriptions for select using (user_id=auth.uid() or public.is_admin());
drop policy if exists push_subscriptions_self_insert on public.push_subscriptions;
create policy push_subscriptions_self_insert on public.push_subscriptions for insert with check (user_id=auth.uid());
drop policy if exists push_subscriptions_self_update on public.push_subscriptions;
create policy push_subscriptions_self_update on public.push_subscriptions for update using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
drop policy if exists push_subscriptions_self_delete on public.push_subscriptions;
create policy push_subscriptions_self_delete on public.push_subscriptions for delete using (user_id=auth.uid() or public.is_admin());
drop policy if exists push_jobs_admin on public.push_jobs;
create policy push_jobs_admin on public.push_jobs for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications for update using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());

create or replace function public.publish_broadcast(
  p_title text,
  p_body text,
  p_message_type text default 'information',
  p_priority text default 'normal',
  p_audience jsonb default '{"type":"all"}'::jsonb,
  p_action_url text default '/usuario',
  p_image_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_broadcast_id uuid;
  v_recipient_count integer := 0;
  v_audience_type text := coalesce(p_audience->>'type','all');
  v_level text := p_audience->>'level';
  v_state text := p_audience->>'state';
  v_amount integer := greatest(1,coalesce(nullif(p_audience->>'amount','')::integer,1));
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede enviar comunicaciones.'; end if;
  if nullif(trim(p_title),'') is null or nullif(trim(p_body),'') is null then raise exception 'El título y el mensaje son obligatorios.'; end if;

  insert into public.broadcasts(title,body,message_type,priority,audience,status,sent_at,created_by)
  values(trim(p_title),trim(p_body),p_message_type,p_priority,p_audience,'sent',now(),auth.uid())
  returning id into v_broadcast_id;

  with eligible as (
    select p.id
    from public.profiles p
    where p.role='usuario'
      and (v_audience_type <> 'location' or p.state=v_state)
      and (v_audience_type <> 'level' or exists(
        select 1 from public.levels l
        where l.name=v_level and l.is_active
          and p.total_points >= l.minimum_points
          and (l.maximum_points is null or p.total_points <= l.maximum_points)
      ))
    order by case when v_audience_type='random' then random() else 0 end, p.id
    limit case when v_audience_type='random' then v_amount else 2147483647 end
  ), inserted as (
    insert into public.notifications(user_id,broadcast_id,title,body,type,action_url,image_url)
    select id,v_broadcast_id,trim(p_title),trim(p_body),p_message_type,p_action_url,p_image_url from eligible
    returning 1
  )
  select count(*) into v_recipient_count from inserted;

  update public.broadcasts set recipient_count=v_recipient_count where id=v_broadcast_id;
  insert into public.push_jobs(broadcast_id,status,batch_size) values(v_broadcast_id,'pending',250)
  on conflict(broadcast_id) do nothing;

  return jsonb_build_object('broadcast_id',v_broadcast_id,'recipients',v_recipient_count);
end;
$$;

grant execute on function public.publish_broadcast(text,text,text,text,jsonb,text,text) to authenticated;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer;
begin
  update public.notifications set read_at=coalesce(read_at,now()) where user_id=auth.uid() and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
grant execute on function public.mark_all_notifications_read() to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;


-- ===== 20260803113000_add_sponsor_role.sql =====
-- Agrega el tercer rol. Debe ejecutarse antes de la migración del portal.
alter type public.app_role add value if not exists 'sponsor';


-- ===== 20260803113100_sponsor_portal_attribution.sql =====

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


-- ===== 20260803120000_admin_sponsor_campaign_approval.sql =====
alter table public.campaign_sponsors
  add column if not exists submitted_at timestamptz not null default now(),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

create index if not exists campaign_sponsors_approval_idx
  on public.campaign_sponsors(approval_status, submitted_at desc);

create or replace function public.review_sponsor_campaign(
  p_campaign_id uuid,
  p_decision text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_status public.campaign_status;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede revisar campañas de patrocinadores.';
  end if;

  if p_decision not in ('approved', 'changes_requested', 'rejected') then
    raise exception 'Decisión no válida.';
  end if;

  select c.*
  into v_campaign
  from public.campaigns c
  join public.campaign_sponsors cs on cs.campaign_id = c.id
  where c.id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaña de patrocinador no encontrada.';
  end if;

  if p_decision = 'approved' then
    if v_campaign.ends_at is not null and v_campaign.ends_at < now() then
      v_status := 'finished';
    elsif v_campaign.starts_at is not null and v_campaign.starts_at > now() then
      v_status := 'scheduled';
    else
      v_status := 'active';
    end if;

    update public.campaigns
    set status = v_status,
        updated_at = now()
    where id = p_campaign_id;

    update public.campaign_sponsors
    set approval_status = 'approved',
        approved_by = auth.uid(),
        approved_at = now(),
        reviewed_at = now(),
        review_notes = nullif(trim(coalesce(p_notes, '')), '')
    where campaign_id = p_campaign_id;
  else
    update public.campaigns
    set status = 'draft',
        updated_at = now()
    where id = p_campaign_id;

    update public.campaign_sponsors
    set approval_status = p_decision,
        approved_by = null,
        approved_at = null,
        reviewed_at = now(),
        review_notes = nullif(trim(coalesce(p_notes, '')), '')
    where campaign_id = p_campaign_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'campaignId', p_campaign_id,
    'decision', p_decision,
    'campaignStatus', (select status::text from public.campaigns where id = p_campaign_id)
  );
end;
$$;

grant execute on function public.review_sponsor_campaign(uuid, text, text) to authenticated;


-- ===== 20260803133000_sponsor_admin_notifications_and_demo_status.sql =====
-- Flujo completo de revisión: avisos a administradores y patrocinadores.

-- La campaña sembrada es únicamente demostrativa; no debe publicarse como una campaña real.
update public.campaigns
set status = 'draft', updated_at = now()
where metadata->>'demoSponsor' = 'true';

update public.campaign_sponsors cs
set approval_status = 'draft', reviewed_at = null, review_notes = 'Campaña de demostración para visualizar el dashboard.'
from public.campaigns c
where c.id = cs.campaign_id
  and c.metadata->>'demoSponsor' = 'true';

create or replace function public.notify_admins_sponsor_campaign_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_name text;
  v_org_name text;
begin
  if new.approval_status <> 'in_review' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.approval_status = 'in_review' then
    return new;
  end if;

  select c.name, o.name
    into v_campaign_name, v_org_name
  from public.campaigns c
  join public.sponsor_organizations o on o.id = new.organization_id
  where c.id = new.campaign_id;

  insert into public.notifications(user_id, title, body, type, action_url)
  select p.id,
         'Nueva campaña por revisar',
         coalesce(v_org_name, 'Una marca') || ' envió la campaña “' || coalesce(v_campaign_name, 'Sin nombre') || '” para aprobación.',
         'sponsor_campaign_review',
         '/admin/campanas-patrocinadores?campaign=' || new.campaign_id::text
  from public.profiles p
  where p.role = 'admin';

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_sponsor_campaign_review on public.campaign_sponsors;
create trigger trg_notify_admins_sponsor_campaign_review
after insert or update of approval_status on public.campaign_sponsors
for each row execute function public.notify_admins_sponsor_campaign_review();

create or replace function public.review_sponsor_campaign(
  p_campaign_id uuid,
  p_decision text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_status public.campaign_status;
  v_sponsor_user uuid;
  v_title text;
  v_body text;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede revisar campañas de patrocinadores.';
  end if;

  if p_decision not in ('approved', 'changes_requested', 'rejected') then
    raise exception 'Decisión no válida.';
  end if;

  select c.*
  into v_campaign
  from public.campaigns c
  join public.campaign_sponsors cs on cs.campaign_id = c.id
  where c.id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaña de patrocinador no encontrada.';
  end if;

  select sm.user_id
    into v_sponsor_user
  from public.campaign_sponsors cs
  join public.sponsor_members sm on sm.organization_id = cs.organization_id
  where cs.campaign_id = p_campaign_id
  order by case when sm.role = 'owner' then 0 else 1 end
  limit 1;

  if p_decision = 'approved' then
    if v_campaign.ends_at is not null and v_campaign.ends_at < now() then
      v_status := 'finished';
    elsif v_campaign.starts_at is not null and v_campaign.starts_at > now() then
      v_status := 'scheduled';
    else
      v_status := 'active';
    end if;

    update public.campaigns set status = v_status, updated_at = now() where id = p_campaign_id;
    update public.campaign_sponsors
       set approval_status = 'approved', approved_by = auth.uid(), approved_at = now(), reviewed_at = now(), review_notes = nullif(trim(coalesce(p_notes, '')), '')
     where campaign_id = p_campaign_id;
    v_title := 'Campaña aprobada';
    v_body := 'La campaña “' || v_campaign.name || '” fue aprobada y quedó en estado ' || v_status::text || '.';
  else
    update public.campaigns set status = 'draft', updated_at = now() where id = p_campaign_id;
    update public.campaign_sponsors
       set approval_status = p_decision, approved_by = null, approved_at = null, reviewed_at = now(), review_notes = nullif(trim(coalesce(p_notes, '')), '')
     where campaign_id = p_campaign_id;
    v_title := case when p_decision = 'changes_requested' then 'Cambios solicitados' else 'Campaña rechazada' end;
    v_body := v_title || ' para “' || v_campaign.name || '”.' || case when nullif(trim(coalesce(p_notes, '')), '') is not null then ' Comentario: ' || trim(p_notes) else '' end;
  end if;

  if v_sponsor_user is not null then
    insert into public.notifications(user_id, title, body, type, action_url)
    values(v_sponsor_user, v_title, v_body, 'sponsor_campaign_result', '/patrocinador/campanas');
  end if;

  return jsonb_build_object('ok', true, 'campaignId', p_campaign_id, 'decision', p_decision, 'campaignStatus', (select status::text from public.campaigns where id = p_campaign_id));
end;
$$;

grant execute on function public.review_sponsor_campaign(uuid, text, text) to authenticated;


-- ===== 20260803150000_admin_sponsors_preferences_targeted_broadcasts.sql =====
-- Planes, preferencias globales, alta controlada de patrocinadores y audiencias dirigidas.
create table if not exists public.subscription_plans (
  code text primary key check (code in ('basic','intermediate','premium')),
  name text not null,
  allows_ticket boolean not null default true,
  allows_qr boolean not null default false,
  allows_map boolean not null default false,
  max_active_campaigns integer,
  created_at timestamptz not null default now()
);
insert into public.subscription_plans(code,name,allows_ticket,allows_qr,allows_map,max_active_campaigns) values
 ('basic','Básico',true,false,false,2),
 ('intermediate','Intermedio',true,true,false,5),
 ('premium','Premium',true,true,true,null)
on conflict(code) do update set name=excluded.name,allows_ticket=excluded.allows_ticket,allows_qr=excluded.allows_qr,allows_map=excluded.allows_map,max_active_campaigns=excluded.max_active_campaigns;

alter table public.sponsor_organizations add column if not exists plan_code text references public.subscription_plans(code) default 'basic';
alter table public.sponsor_organizations add column if not exists membership_starts_at timestamptz default now();
alter table public.sponsor_organizations add column if not exists membership_ends_at timestamptz;
alter table public.sponsor_organizations add column if not exists membership_status text not null default 'active' check (membership_status in ('trial','active','past_due','suspended','cancelled'));
update public.sponsor_organizations set plan_code='premium' where slug='marca-demo-home-run';

-- app_settings ya fue creada anteriormente con las columnas key/value.
-- Se conserva una sola estructura para evitar incompatibilidades.
insert into public.app_settings(key,value,updated_at)
values('ticker_enabled','true'::jsonb,now())
on conflict(key) do nothing;
alter table public.app_settings enable row level security;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select using (true);
drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists sponsor_org_admin_write on public.sponsor_organizations;
create policy sponsor_org_admin_write on public.sponsor_organizations for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists sponsor_members_admin_write on public.sponsor_members;
create policy sponsor_members_admin_write on public.sponsor_members for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.publish_broadcast(
  p_title text,
  p_body text,
  p_message_type text default 'information',
  p_priority text default 'normal',
  p_audience jsonb default '{"type":"all"}'::jsonb,
  p_action_url text default '/usuario',
  p_image_url text default null
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_broadcast_id uuid;
  v_recipient_count integer := 0;
  v_audience_type text := coalesce(p_audience->>'type','all');
  v_level text := p_audience->>'level';
  v_state text := p_audience->>'state';
  v_amount integer := greatest(1,coalesce(nullif(p_audience->>'amount','')::integer,1));
  v_ids uuid[] := array(select jsonb_array_elements_text(coalesce(p_audience->'userIds','[]'::jsonb))::uuid limit 10);
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede enviar comunicaciones.'; end if;
  if nullif(trim(p_title),'') is null or nullif(trim(p_body),'') is null then raise exception 'El título y el mensaje son obligatorios.'; end if;
  if v_audience_type='specific' and coalesce(array_length(v_ids,1),0)=0 then raise exception 'Selecciona al menos un destinatario.'; end if;

  insert into public.broadcasts(title,body,message_type,priority,audience,status,sent_at,created_by)
  values(trim(p_title),trim(p_body),p_message_type,p_priority,p_audience,'sent',now(),auth.uid()) returning id into v_broadcast_id;

  with eligible as (
    select p.id
    from public.profiles p
    where (
      (v_audience_type='all' and p.role='usuario')
      or (v_audience_type='sponsors' and p.role='sponsor')
      or (v_audience_type='specific' and p.id=any(v_ids))
      or (v_audience_type='location' and p.role='usuario' and p.state=v_state)
      or (v_audience_type='level' and p.role='usuario' and exists(
        select 1 from public.levels l where l.name=v_level and l.is_active
          and p.total_points>=l.minimum_points and (l.maximum_points is null or p.total_points<=l.maximum_points)
      ))
      or (v_audience_type='random' and p.role='usuario')
    )
    order by case when v_audience_type='random' then random() else 0 end,p.id
    limit case when v_audience_type='random' then v_amount else 2147483647 end
  ), inserted as (
    insert into public.notifications(user_id,broadcast_id,title,body,type,action_url,image_url)
    select id,v_broadcast_id,trim(p_title),trim(p_body),p_message_type,
      case when p_action_url='/usuario' and v_audience_type='sponsors' then '/patrocinador' else p_action_url end,p_image_url
    from eligible returning 1
  ) select count(*) into v_recipient_count from inserted;

  update public.broadcasts set recipient_count=v_recipient_count where id=v_broadcast_id;
  insert into public.push_jobs(broadcast_id,status,batch_size) values(v_broadcast_id,'pending',250)
  on conflict(broadcast_id) do nothing;
  return jsonb_build_object('broadcast_id',v_broadcast_id,'recipients',v_recipient_count);
end; $$;
grant execute on function public.publish_broadcast(text,text,text,text,jsonb,text,text) to authenticated;


-- ===== 20260803150500_fix_app_settings_ticker_columns.sql =====
-- Punto de compatibilidad para app_settings
-- La tabla existente usa las columnas: key, value, updated_by, updated_at.
-- Esta migración registra la preferencia global para encender o apagar la cinta infinita.

insert into public.app_settings (
  key,
  value,
  updated_at
)
values (
  'ticker_enabled',
  'true'::jsonb,
  now()
)
on conflict (key)
do update set
  value = excluded.value,
  updated_at = now();

-- Verificación opcional:
-- select key, value, updated_at
-- from public.app_settings
-- where key = 'ticker_enabled';


-- ===== 20260803161000_sponsor_campaign_modalities_and_plan_enforcement.sql =====
-- Modalidades por plan para patrocinadores y permisos de configuración.

create or replace function public.validate_sponsor_campaign_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type public.campaign_type;
  v_plan public.subscription_plans%rowtype;
begin
  select c.type into v_type from public.campaigns c where c.id = new.campaign_id;
  select sp.* into v_plan
  from public.sponsor_organizations so
  join public.subscription_plans sp on sp.code = so.plan_code
  where so.id = new.organization_id;

  if v_plan.code is null then
    raise exception 'La organización no tiene un plan válido.';
  end if;
  if v_type = 'brand' and not v_plan.allows_ticket then
    raise exception 'El plan contratado no permite campañas por ticket.';
  end if;
  if v_type = 'qr' and not v_plan.allows_qr then
    raise exception 'El plan contratado no permite campañas QR.';
  end if;
  if v_type = 'map' and not v_plan.allows_map then
    raise exception 'El plan contratado no permite campañas de mapa.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_sponsor_campaign_plan_trigger on public.campaign_sponsors;
create trigger validate_sponsor_campaign_plan_trigger
before insert or update of organization_id, campaign_id on public.campaign_sponsors
for each row execute function public.validate_sponsor_campaign_plan();

drop policy if exists sponsor_qr_codes_write on public.qr_codes;
create policy sponsor_qr_codes_write on public.qr_codes
for all
using (public.sponsor_owns_campaign(campaign_id))
with check (public.sponsor_owns_campaign(campaign_id));

drop policy if exists sponsor_campaign_locations_write on public.campaign_locations;
create policy sponsor_campaign_locations_write on public.campaign_locations
for all
using (public.sponsor_owns_campaign(campaign_id))
with check (public.sponsor_owns_campaign(campaign_id));


-- ===== 20260803162000_fix_ticker_setting_integration.sql =====
-- Corrige la integración del interruptor de la cinta infinita con la estructura
-- real de public.app_settings (columnas key/value).

insert into public.app_settings (
  key,
  value,
  updated_at
)
values (
  'ticker_enabled',
  'true'::jsonb,
  now()
)
on conflict (key)
do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read
  on public.app_settings
  for select
  using (true);

drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin
  on public.app_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Realtime necesita que la tabla forme parte de la publicación. El bloque es
-- idempotente y no falla cuando ya estaba agregada.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end;
$$;


-- ===== 20260803170000_fix_sponsor_plan_context_and_ticket_branches.sql =====
-- Resolve sponsor organization and subscription plan in one secure call.
-- Also allows sponsors to register the valid branches for ticket campaigns.

create or replace function public.get_my_sponsor_context()
returns table (
  organization_id uuid,
  organization_name text,
  plan_code text,
  plan_name text,
  allows_ticket boolean,
  allows_qr boolean,
  allows_map boolean,
  max_active_campaigns integer,
  membership_status text,
  membership_ends_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    so.id,
    so.name,
    coalesce(so.plan_code, 'basic'),
    sp.name,
    sp.allows_ticket,
    sp.allows_qr,
    sp.allows_map,
    sp.max_active_campaigns,
    so.membership_status,
    so.membership_ends_at
  from public.sponsor_members sm
  join public.sponsor_organizations so
    on so.id = sm.organization_id
  join public.subscription_plans sp
    on sp.code = coalesce(so.plan_code, 'basic')
  where sm.user_id = auth.uid()
    and so.is_active = true
  order by sm.created_at asc
  limit 1;
$$;

revoke all on function public.get_my_sponsor_context() from public;
grant execute on function public.get_my_sponsor_context() to authenticated;

-- The plan catalogue is not sensitive and can be read by authenticated users.
alter table public.subscription_plans enable row level security;
drop policy if exists subscription_plans_authenticated_read on public.subscription_plans;
create policy subscription_plans_authenticated_read
  on public.subscription_plans
  for select
  to authenticated
  using (true);

-- Sponsors may insert and read branches only for campaigns that belong to their organization.
alter table public.brand_locations enable row level security;

drop policy if exists brand_locations_sponsor_read on public.brand_locations;
create policy brand_locations_sponsor_read
  on public.brand_locations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.campaign_sponsors cs
      join public.sponsor_members sm
        on sm.organization_id = cs.organization_id
      where cs.campaign_id = brand_locations.campaign_id
        and sm.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists brand_locations_sponsor_insert on public.brand_locations;
create policy brand_locations_sponsor_insert
  on public.brand_locations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.campaign_sponsors cs
      join public.sponsor_members sm
        on sm.organization_id = cs.organization_id
      where cs.campaign_id = brand_locations.campaign_id
        and sm.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists brand_locations_sponsor_update on public.brand_locations;
create policy brand_locations_sponsor_update
  on public.brand_locations
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.campaign_sponsors cs
      join public.sponsor_members sm
        on sm.organization_id = cs.organization_id
      where cs.campaign_id = brand_locations.campaign_id
        and sm.user_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1
      from public.campaign_sponsors cs
      join public.sponsor_members sm
        on sm.organization_id = cs.organization_id
      where cs.campaign_id = brand_locations.campaign_id
        and sm.user_id = auth.uid()
    )
    or public.is_admin()
  );


-- ===== 20260803173000_fix_ticker_toggle_end_to_end.sql =====
-- Corrige de extremo a extremo el interruptor de la cinta infinita.
-- La tabla real public.app_settings usa key/value.

insert into public.app_settings (
  key,
  value,
  updated_at
)
values (
  'ticker_enabled',
  'true'::jsonb,
  now()
)
on conflict (key)
do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_public_read on public.app_settings;
create policy app_settings_public_read
  on public.app_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write
  on public.app_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Permite que los cambios se propaguen por Supabase Realtime.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end;
$$;


-- ===== 20260803180000_manual_ticket_review_flow.sql =====
-- Flujo manual de validación de tickets para pilotos comerciales.
-- El usuario carga el comprobante y un administrador aprueba o rechaza.

create index if not exists ticket_submissions_manual_queue_idx
  on public.ticket_submissions(status, created_at desc)
  where status in ('pending','manual_review');

create index if not exists ticket_images_submission_sort_idx
  on public.ticket_images(submission_id, sort_order);

-- Permite que el administrador consulte todas las imágenes de tickets.
drop policy if exists ticket_images_admin_read on public.ticket_images;
create policy ticket_images_admin_read
  on public.ticket_images
  for select
  using (public.is_admin());

create or replace function public.review_ticket_submission(
  p_submission_id uuid,
  p_decision text,
  p_reason text default null,
  p_purchase_total numeric default null,
  p_ticket_number text default null,
  p_purchase_date date default null,
  p_merchant_name text default null,
  p_branch_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_admin uuid := auth.uid();
  v_ticket public.ticket_submissions%rowtype;
  v_campaign public.campaigns%rowtype;
  v_location public.campaign_locations%rowtype;
  v_participation uuid;
  v_points integer;
  v_reward text;
  v_reward_code text;
  v_status public.ticket_status;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede revisar tickets.';
  end if;

  if p_decision not in ('approved','rejected') then
    raise exception 'La decisión debe ser approved o rejected.';
  end if;

  select * into v_ticket
  from public.ticket_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Ticket no encontrado.';
  end if;

  if v_ticket.status not in ('pending','manual_review') then
    return jsonb_build_object(
      'ok', false,
      'status', v_ticket.status,
      'message', 'Este ticket ya fue revisado.'
    );
  end if;

  select * into v_campaign
  from public.campaigns
  where id = v_ticket.campaign_id
    and type = 'brand';

  if not found then
    raise exception 'Campaña de ticket no encontrada.';
  end if;

  select * into v_location
  from public.campaign_locations
  where campaign_id = v_ticket.campaign_id
    and is_active
  order by created_at
  limit 1;

  v_status := case when p_decision = 'approved' then 'approved'::public.ticket_status else 'rejected'::public.ticket_status end;

  update public.ticket_submissions
  set
    status = v_status,
    validation_reason = coalesce(nullif(trim(p_reason), ''), case when p_decision='approved' then 'Ticket validado manualmente.' else 'Ticket rechazado manualmente.' end),
    purchase_total = coalesce(p_purchase_total, purchase_total),
    ticket_number = coalesce(nullif(trim(p_ticket_number), ''), ticket_number),
    purchase_date = coalesce(p_purchase_date, purchase_date),
    merchant_name = coalesce(nullif(trim(p_merchant_name), ''), merchant_name),
    branch_name = coalesce(nullif(trim(p_branch_name), ''), branch_name),
    reviewed_at = now(),
    reviewed_by = v_admin
  where id = p_submission_id
  returning * into v_ticket;

  if p_decision = 'approved' then
    if v_ticket.purchase_total is null or v_ticket.purchase_total < 0 then
      raise exception 'Captura un monto válido antes de aprobar.';
    end if;

    if not exists (
      select 1
      from public.participations p
      where p.user_id = v_ticket.user_id
        and p.campaign_id = v_ticket.campaign_id
        and p.metadata ->> 'ticket_submission_id' = v_ticket.id::text
    ) then
      v_points := coalesce(v_location.points, v_campaign.points_on_success, 0);
      v_reward := coalesce(v_location.reward_name, v_campaign.metadata ->> 'reward', v_campaign.name);
      v_reward_code := coalesce(v_location.reward_code, v_campaign.metadata ->> 'rewardCode');

      insert into public.participations(
        campaign_id,
        user_id,
        location_id,
        status,
        score,
        points_awarded,
        completed_at,
        metadata
      )
      values(
        v_ticket.campaign_id,
        v_ticket.user_id,
        v_location.id,
        'completed',
        100,
        v_points,
        now(),
        jsonb_build_object(
          'ticket_submission_id', v_ticket.id,
          'manual_review', true,
          'purchase_total', v_ticket.purchase_total
        )
      )
      returning id into v_participation;

      if v_points <> 0 then
        insert into public.point_transactions(
          user_id,
          campaign_id,
          participation_id,
          points,
          transaction_type,
          description
        )
        values(
          v_ticket.user_id,
          v_ticket.campaign_id,
          v_participation,
          v_points,
          'ticket_approved',
          'Ticket aprobado: ' || v_campaign.name
        );
      end if;

      if v_reward is not null then
        insert into public.reward_claims(
          user_id,
          campaign_id,
          participation_id,
          reward_name,
          reward_code
        )
        values(
          v_ticket.user_id,
          v_ticket.campaign_id,
          v_participation,
          v_reward,
          v_reward_code
        );
      end if;
    end if;

    insert into public.notifications(user_id,title,body,type,action_url)
    values(
      v_ticket.user_id,
      'Ticket aprobado',
      'Tu ticket de ' || v_campaign.name || ' fue aprobado. Ya puedes consultar tus puntos y recompensas.',
      'ticket_approved',
      '/usuario/recompensas'
    );
  else
    insert into public.notifications(user_id,title,body,type,action_url)
    values(
      v_ticket.user_id,
      'Ticket rechazado',
      'Tu ticket de ' || v_campaign.name || ' fue rechazado. Motivo: ' || coalesce(nullif(trim(p_reason),''),'No cumple las reglas de la campaña.'),
      'ticket_rejected',
      '/usuario/cazar-recompensas/marca'
    );
  end if;

  perform public.refresh_campaign_metric_day(v_ticket.campaign_id, v_ticket.created_at::date);

  return jsonb_build_object(
    'ok', true,
    'status', v_status,
    'submissionId', v_ticket.id,
    'message', case when p_decision='approved' then 'Ticket aprobado correctamente.' else 'Ticket rechazado correctamente.' end
  );
end;
$function$;

grant execute on function public.review_ticket_submission(uuid,text,text,numeric,text,date,text,text) to authenticated;

create or replace function public.notify_admins_new_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_campaign_name text;
begin
  select name into v_campaign_name from public.campaigns where id = new.campaign_id;

  insert into public.notifications(user_id,title,body,type,action_url)
  select
    p.id,
    'Nuevo ticket por revisar',
    'Se recibió un ticket para la campaña ' || coalesce(v_campaign_name,'Campaña') || '.',
    'ticket_review',
    '/admin/tickets'
  from public.profiles p
  where p.role = 'admin';

  return new;
end;
$function$;

drop trigger if exists ticket_notify_admins on public.ticket_submissions;
create trigger ticket_notify_admins
after insert on public.ticket_submissions
for each row
when (new.status in ('pending','manual_review'))
execute function public.notify_admins_new_ticket();


-- ===== 20260805090000_production_hardening.sql =====
-- Home Run Rewards: endurecimiento para producción y crecimiento gradual.
create extension if not exists pgcrypto;

alter table if exists public.broadcasts add column if not exists idempotency_key uuid;
create unique index if not exists broadcasts_created_by_idempotency_uidx on public.broadcasts(created_by,idempotency_key) where idempotency_key is not null;
create unique index if not exists notifications_user_broadcast_uidx on public.notifications(user_id,broadcast_id) where broadcast_id is not null;
create index if not exists notifications_user_unread_created_idx on public.notifications(user_id,created_at desc) where read_at is null;
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
create index if not exists broadcasts_created_at_idx on public.broadcasts(created_at desc);
create index if not exists profiles_role_name_idx on public.profiles(role,full_name);

create table if not exists public.reward_inventory (id uuid primary key default gen_random_uuid(), reward_id uuid not null, tenant_id uuid, total_units integer not null check(total_units>=0), available_units integer not null check(available_units>=0 and available_units<=total_units), updated_at timestamptz not null default now(), unique(reward_id,tenant_id));
create table if not exists public.reward_claims (id uuid primary key default gen_random_uuid(), reward_id uuid not null, inventory_id uuid not null references public.reward_inventory(id), user_id uuid not null references auth.users(id), idempotency_key uuid not null, status text not null default 'claimed' check(status in ('reserved','claimed','expired','delivered','cancelled')), claimed_at timestamptz not null default now(), unique(user_id,idempotency_key));
create unique index if not exists reward_claims_one_active_per_reward_user on public.reward_claims(reward_id,user_id) where status in ('reserved','claimed','delivered');
create index if not exists reward_claims_user_created_idx on public.reward_claims(user_id,claimed_at desc);
create index if not exists reward_claims_reward_status_idx on public.reward_claims(reward_id,status);
alter table public.reward_inventory enable row level security;
alter table public.reward_claims enable row level security;
drop policy if exists "usuarios leen sus reclamaciones" on public.reward_claims;
create policy "usuarios leen sus reclamaciones" on public.reward_claims for select to authenticated using(user_id=auth.uid());

create or replace function public.claim_reward_safely(p_reward_id uuid,p_idempotency_key uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare v_user uuid:=auth.uid(); v_inventory public.reward_inventory%rowtype; v_claim public.reward_claims%rowtype; begin if v_user is null then raise exception 'AUTH_REQUIRED'; end if; select * into v_claim from public.reward_claims where user_id=v_user and idempotency_key=p_idempotency_key; if found then return jsonb_build_object('claim_id',v_claim.id,'status',v_claim.status,'idempotent',true); end if; select * into v_inventory from public.reward_inventory where reward_id=p_reward_id and available_units>0 order by updated_at for update skip locked limit 1; if not found then return jsonb_build_object('status','unavailable','idempotent',false); end if; update public.reward_inventory set available_units=available_units-1,updated_at=now() where id=v_inventory.id and available_units>0; if not found then return jsonb_build_object('status','unavailable','idempotent',false); end if; insert into public.reward_claims(reward_id,inventory_id,user_id,idempotency_key) values(p_reward_id,v_inventory.id,v_user,p_idempotency_key) returning * into v_claim; return jsonb_build_object('claim_id',v_claim.id,'status',v_claim.status,'idempotent',false); exception when unique_violation then select * into v_claim from public.reward_claims where user_id=v_user and idempotency_key=p_idempotency_key; return jsonb_build_object('claim_id',v_claim.id,'status',coalesce(v_claim.status,'claimed'),'idempotent',true); end $$;
grant execute on function public.claim_reward_safely(uuid,uuid) to authenticated;

create or replace function public.publish_broadcast(p_title text,p_body text,p_message_type text default 'information',p_priority text default 'normal',p_audience jsonb default '{"type":"all"}'::jsonb,p_action_url text default '/usuario',p_image_url text default null,p_idempotency_key uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare v_creator uuid:=auth.uid(); v_existing public.broadcasts%rowtype; v_broadcast_id uuid; v_count integer:=0; v_type text:=coalesce(p_audience->>'type','all'); v_level text:=p_audience->>'level'; v_state text:=p_audience->>'state'; v_amount integer:=greatest(1,coalesce(nullif(p_audience->>'amount','')::integer,1)); begin if not public.is_admin() then raise exception 'Solo un administrador puede enviar comunicaciones.'; end if; if nullif(trim(p_title),'') is null or nullif(trim(p_body),'') is null then raise exception 'El título y el mensaje son obligatorios.'; end if; if p_idempotency_key is not null then select * into v_existing from public.broadcasts where created_by=v_creator and idempotency_key=p_idempotency_key; if found then return jsonb_build_object('broadcast_id',v_existing.id,'recipients',v_existing.recipient_count,'idempotent',true); end if; end if; insert into public.broadcasts(title,body,message_type,priority,audience,status,sent_at,created_by,idempotency_key) values(trim(p_title),trim(p_body),p_message_type,p_priority,p_audience,'sent',now(),v_creator,p_idempotency_key) returning id into v_broadcast_id; with eligible as (select p.id from public.profiles p where ((v_type='specific' and p.id::text in(select jsonb_array_elements_text(coalesce(p_audience->'userIds','[]'::jsonb)))) or (v_type='sponsors' and p.role='sponsor') or (v_type not in('specific','sponsors') and p.role='usuario')) and (v_type<>'location' or p.state=v_state) and (v_type<>'level' or exists(select 1 from public.levels l where l.name=v_level and l.is_active and p.total_points>=l.minimum_points and (l.maximum_points is null or p.total_points<=l.maximum_points))) order by case when v_type='random' then random() else 0 end,p.id limit case when v_type='random' then v_amount else 2147483647 end), inserted as (insert into public.notifications(user_id,broadcast_id,title,body,type,action_url,image_url) select id,v_broadcast_id,trim(p_title),trim(p_body),p_message_type,p_action_url,p_image_url from eligible on conflict(user_id,broadcast_id) do nothing returning 1) select count(*) into v_count from inserted; update public.broadcasts set recipient_count=v_count where id=v_broadcast_id; insert into public.push_jobs(broadcast_id,status,batch_size) values(v_broadcast_id,'pending',250) on conflict(broadcast_id) do nothing; return jsonb_build_object('broadcast_id',v_broadcast_id,'recipients',v_count,'idempotent',false); end $$;
grant execute on function public.publish_broadcast(text,text,text,text,jsonb,text,text,uuid) to authenticated;
