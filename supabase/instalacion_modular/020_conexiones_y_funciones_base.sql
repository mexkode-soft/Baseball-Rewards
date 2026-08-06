-- Home Run Rewards | instalación modular
-- Archivo: 020_conexiones_y_funciones_base.sql
-- Fuente histórica: 202608020002_real_data_connections.sql
-- Ejecutar únicamente después del archivo anterior.

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
