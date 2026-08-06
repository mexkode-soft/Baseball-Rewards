-- Home Run Rewards | instalación modular
-- Archivo: 040_sincronizacion_perfiles_auth.sql
-- Fuente histórica: 202608020004_fix_profiles_auth_sync.sql
-- Ejecutar únicamente después del archivo anterior.

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
