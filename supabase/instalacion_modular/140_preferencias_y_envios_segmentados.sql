-- Home Run Rewards | instalación modular
-- Archivo: 140_preferencias_y_envios_segmentados.sql
-- Fuente histórica: 20260803150000_admin_sponsors_preferences_targeted_broadcasts.sql
-- Ejecutar únicamente después del archivo anterior.

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

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
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
