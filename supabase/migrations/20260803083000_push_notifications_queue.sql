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
