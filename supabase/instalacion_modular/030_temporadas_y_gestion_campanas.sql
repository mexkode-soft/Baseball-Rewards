-- Home Run Rewards | instalación modular
-- Archivo: 030_temporadas_y_gestion_campanas.sql
-- Fuente histórica: 202608020003_seasons_campaign_management.sql
-- Ejecutar únicamente después del archivo anterior.

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
