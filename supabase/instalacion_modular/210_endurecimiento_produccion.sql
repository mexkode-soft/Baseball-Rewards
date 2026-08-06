-- Home Run Rewards | instalación modular
-- Archivo: 210_endurecimiento_produccion.sql
-- Corrección: evita reutilizar public.reward_claims, tabla funcional ya creada
-- en 010_esquema_principal.sql. Las reclamaciones transaccionales de inventario
-- se almacenan de forma aislada en public.reward_inventory_claims.
-- Ejecutar únicamente después del archivo anterior.

-- Home Run Rewards: endurecimiento para producción y crecimiento gradual.
alter table if exists public.broadcasts
  add column if not exists idempotency_key uuid;

create unique index if not exists broadcasts_created_by_idempotency_uidx
  on public.broadcasts(created_by, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists notifications_user_broadcast_uidx
  on public.notifications(user_id, broadcast_id)
  where broadcast_id is not null;

create index if not exists notifications_user_unread_created_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists broadcasts_created_at_idx
  on public.broadcasts(created_at desc);

create index if not exists profiles_role_name_idx
  on public.profiles(role, full_name);

-- Inventario autoritativo por premio y tenant.
create table if not exists public.reward_inventory (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null,
  tenant_id uuid,
  total_units integer not null check (total_units >= 0),
  available_units integer not null
    check (available_units >= 0 and available_units <= total_units),
  updated_at timestamptz not null default now()
);

-- Evita inventarios duplicados. Se separa el caso tenant nulo porque una
-- restricción UNIQUE convencional permite múltiples valores NULL.
create unique index if not exists reward_inventory_reward_tenant_uidx
  on public.reward_inventory(reward_id, tenant_id)
  where tenant_id is not null;

create unique index if not exists reward_inventory_reward_global_uidx
  on public.reward_inventory(reward_id)
  where tenant_id is null;

-- IMPORTANTE: public.reward_claims ya existe y representa los premios visibles
-- del usuario (campaign_id, reward_name, reward_code, etc.). No se modifica.
-- Esta tabla nueva registra exclusivamente la reserva/consumo atómico de stock.
create table if not exists public.reward_inventory_claims (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null,
  inventory_id uuid not null
    references public.reward_inventory(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  status text not null default 'claimed'
    check (status in ('reserved', 'claimed', 'expired', 'delivered', 'cancelled')),
  claimed_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

create unique index if not exists reward_inventory_claims_one_active_per_reward_user
  on public.reward_inventory_claims(reward_id, user_id)
  where status in ('reserved', 'claimed', 'delivered');

create index if not exists reward_inventory_claims_user_created_idx
  on public.reward_inventory_claims(user_id, claimed_at desc);

create index if not exists reward_inventory_claims_reward_status_idx
  on public.reward_inventory_claims(reward_id, status);

alter table public.reward_inventory enable row level security;
alter table public.reward_inventory_claims enable row level security;

drop policy if exists "usuarios leen sus reclamaciones de inventario"
  on public.reward_inventory_claims;

create policy "usuarios leen sus reclamaciones de inventario"
  on public.reward_inventory_claims
  for select
  to authenticated
  using (user_id = auth.uid());

-- Reclamación atómica e idempotente. PostgreSQL es la fuente de verdad;
-- Redis podrá limitar tráfico, pero nunca asignará el premio definitivo.
create or replace function public.claim_reward_safely(
  p_reward_id uuid,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_inventory public.reward_inventory%rowtype;
  v_claim public.reward_inventory_claims%rowtype;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_reward_id is null or p_idempotency_key is null then
    raise exception 'INVALID_ARGUMENTS';
  end if;

  select *
    into v_claim
  from public.reward_inventory_claims
  where user_id = v_user
    and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'claim_id', v_claim.id,
      'status', v_claim.status,
      'idempotent', true
    );
  end if;

  select *
    into v_inventory
  from public.reward_inventory
  where reward_id = p_reward_id
    and available_units > 0
  order by updated_at, id
  for update skip locked
  limit 1;

  if not found then
    return jsonb_build_object(
      'status', 'unavailable',
      'idempotent', false
    );
  end if;

  update public.reward_inventory
  set available_units = available_units - 1,
      updated_at = now()
  where id = v_inventory.id
    and available_units > 0;

  if not found then
    return jsonb_build_object(
      'status', 'unavailable',
      'idempotent', false
    );
  end if;

  insert into public.reward_inventory_claims(
    reward_id,
    inventory_id,
    user_id,
    idempotency_key
  )
  values (
    p_reward_id,
    v_inventory.id,
    v_user,
    p_idempotency_key
  )
  returning * into v_claim;

  return jsonb_build_object(
    'claim_id', v_claim.id,
    'status', v_claim.status,
    'idempotent', false
  );

exception
  when unique_violation then
    select *
      into v_claim
    from public.reward_inventory_claims
    where user_id = v_user
      and idempotency_key = p_idempotency_key;

    if found then
      return jsonb_build_object(
        'claim_id', v_claim.id,
        'status', v_claim.status,
        'idempotent', true
      );
    end if;

    -- La clave fue distinta, pero el usuario ya tiene una reclamación activa
    -- para el mismo premio. La transacción se revierte automáticamente,
    -- incluyendo el decremento de inventario.
    select *
      into v_claim
    from public.reward_inventory_claims
    where user_id = v_user
      and reward_id = p_reward_id
      and status in ('reserved', 'claimed', 'delivered')
    order by claimed_at desc
    limit 1;

    return jsonb_build_object(
      'claim_id', v_claim.id,
      'status', coalesce(v_claim.status, 'claimed'),
      'idempotent', true
    );
end;
$$;

grant execute on function public.claim_reward_safely(uuid, uuid)
  to authenticated;

create or replace function public.publish_broadcast(
  p_title text,
  p_body text,
  p_message_type text default 'information',
  p_priority text default 'normal',
  p_audience jsonb default '{"type":"all"}'::jsonb,
  p_action_url text default '/usuario',
  p_image_url text default null,
  p_idempotency_key uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator uuid := auth.uid();
  v_existing public.broadcasts%rowtype;
  v_broadcast_id uuid;
  v_count integer := 0;
  v_type text := coalesce(p_audience->>'type', 'all');
  v_level text := p_audience->>'level';
  v_state text := p_audience->>'state';
  v_amount integer := greatest(
    1,
    coalesce(nullif(p_audience->>'amount', '')::integer, 1)
  );
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede enviar comunicaciones.';
  end if;

  if nullif(trim(p_title), '') is null
     or nullif(trim(p_body), '') is null then
    raise exception 'El título y el mensaje son obligatorios.';
  end if;

  if p_idempotency_key is not null then
    select *
      into v_existing
    from public.broadcasts
    where created_by = v_creator
      and idempotency_key = p_idempotency_key;

    if found then
      return jsonb_build_object(
        'broadcast_id', v_existing.id,
        'recipients', v_existing.recipient_count,
        'idempotent', true
      );
    end if;
  end if;

  insert into public.broadcasts(
    title,
    body,
    message_type,
    priority,
    audience,
    status,
    sent_at,
    created_by,
    idempotency_key
  )
  values (
    trim(p_title),
    trim(p_body),
    p_message_type,
    p_priority,
    p_audience,
    'sent',
    now(),
    v_creator,
    p_idempotency_key
  )
  returning id into v_broadcast_id;

  with eligible as (
    select p.id
    from public.profiles p
    where (
      (
        v_type = 'specific'
        and p.id::text in (
          select jsonb_array_elements_text(
            coalesce(p_audience->'userIds', '[]'::jsonb)
          )
        )
      )
      or (v_type = 'sponsors' and p.role = 'sponsor')
      or (v_type not in ('specific', 'sponsors') and p.role = 'usuario')
    )
    and (v_type <> 'location' or p.state = v_state)
    and (
      v_type <> 'level'
      or exists (
        select 1
        from public.levels l
        where l.name = v_level
          and l.is_active
          and p.total_points >= l.minimum_points
          and (
            l.maximum_points is null
            or p.total_points <= l.maximum_points
          )
      )
    )
    order by
      case when v_type = 'random' then random() else 0 end,
      p.id
    limit case when v_type = 'random' then v_amount else 2147483647 end
  ),
  inserted as (
    insert into public.notifications(
      user_id,
      broadcast_id,
      title,
      body,
      type,
      action_url,
      image_url
    )
    select
      id,
      v_broadcast_id,
      trim(p_title),
      trim(p_body),
      p_message_type,
      p_action_url,
      p_image_url
    from eligible
    on conflict(user_id, broadcast_id) do nothing
    returning 1
  )
  select count(*) into v_count from inserted;

  update public.broadcasts
  set recipient_count = v_count
  where id = v_broadcast_id;

  insert into public.push_jobs(broadcast_id, status, batch_size)
  values (v_broadcast_id, 'pending', 250)
  on conflict(broadcast_id) do nothing;

  return jsonb_build_object(
    'broadcast_id', v_broadcast_id,
    'recipients', v_count,
    'idempotent', false
  );
end;
$$;

grant execute on function public.publish_broadcast(
  text,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  uuid
) to authenticated;
