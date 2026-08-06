-- Home Run Rewards | Registro completo, documentos legales, cookies y consentimientos
-- Archivo: 360_registro_legal_y_consentimientos.sql
-- Ejecutar después de 350_metricas_admin_y_notificaciones_revision.sql
begin;

alter table public.profiles add column if not exists registration_completed boolean not null default false;

create table if not exists public.legal_documents (
 id uuid primary key default gen_random_uuid(),
 document_type text not null check(document_type in ('privacy','terms','cookies')),
 title text not null,
 version text not null,
 content text not null default '',
 is_active boolean not null default false,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(document_type,version)
);
create unique index if not exists legal_documents_one_active_type on public.legal_documents(document_type) where is_active;

create table if not exists public.user_consents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 document_type text not null check(document_type in ('privacy','terms','cookies')),
 document_version text not null,
 accepted_at timestamptz not null default now(),
 source text not null default 'web',
 unique(user_id,document_type,document_version)
);
create index if not exists user_consents_user_idx on public.user_consents(user_id,accepted_at desc);

alter table public.legal_documents enable row level security;
alter table public.user_consents enable row level security;
grant select on public.legal_documents to anon,authenticated;
grant insert,update,delete on public.legal_documents to authenticated;
grant select,insert on public.user_consents to authenticated;
grant all on public.legal_documents,public.user_consents to service_role;

drop policy if exists legal_documents_public_read on public.legal_documents;
create policy legal_documents_public_read on public.legal_documents for select to anon,authenticated using(is_active or public.is_admin());
drop policy if exists legal_documents_admin_write on public.legal_documents;
create policy legal_documents_admin_write on public.legal_documents for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists user_consents_self_read on public.user_consents;
create policy user_consents_self_read on public.user_consents for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists user_consents_self_insert on public.user_consents;
create policy user_consents_self_insert on public.user_consents for insert to authenticated with check(user_id=auth.uid());

create or replace function public.publicar_documento_legal(p_document_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_type text;
begin
 if not public.is_admin() then raise exception 'Solo un administrador puede publicar documentos legales.'; end if;
 select document_type into v_type from public.legal_documents where id=p_document_id;
 if v_type is null then raise exception 'Documento no encontrado.'; end if;
 update public.legal_documents set is_active=false where document_type=v_type;
 update public.legal_documents set is_active=true,published_at=now(),updated_at=now() where id=p_document_id;
end $$;
grant execute on function public.publicar_documento_legal(uuid) to authenticated;

create or replace view public.legal_consent_summary as
select d.document_type,d.version,count(distinct c.user_id)::bigint as accepted_users
from public.legal_documents d left join public.user_consents c on c.document_type=d.document_type and c.document_version=d.version
where d.is_active group by d.document_type,d.version;
grant select on public.legal_consent_summary to authenticated;

insert into public.legal_documents(document_type,title,version,content,is_active,published_at) values
('privacy','Aviso de Privacidad','1.0','Consulta el Aviso de Privacidad completo publicado en la plataforma.',true,now()),
('terms','Términos y Condiciones','1.0','Consulta los Términos y Condiciones completos publicados en la plataforma.',true,now()),
('cookies','Política de Cookies','1.0','Consulta la Política de Cookies completa publicada en la plataforma.',true,now())
on conflict(document_type,version) do nothing;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_requested_role text;v_role public.app_role;v_completed boolean;v_privacy_version text;v_terms_version text;
begin
 v_requested_role:=lower(coalesce(new.raw_user_meta_data->>'role',new.raw_app_meta_data->>'role','usuario'));
 v_role:=case when v_requested_role='sponsor' then 'sponsor'::public.app_role when v_requested_role='admin' then 'admin'::public.app_role else 'usuario'::public.app_role end;
 v_completed:=coalesce((new.raw_user_meta_data->>'registration_completed')::boolean,false);
 insert into public.profiles(id,email,full_name,avatar_url,role,phone,state,municipality,favorite_team,registration_completed)
 values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(coalesce(new.email,'usuario'),'@',1)),coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture'),v_role,nullif(new.raw_user_meta_data->>'phone',''),nullif(new.raw_user_meta_data->>'state',''),nullif(new.raw_user_meta_data->>'municipality',''),nullif(new.raw_user_meta_data->>'favorite_team',''),v_completed)
 on conflict(id) do update set email=excluded.email,full_name=coalesce(nullif(public.profiles.full_name,''),excluded.full_name),avatar_url=coalesce(public.profiles.avatar_url,excluded.avatar_url),phone=coalesce(excluded.phone,public.profiles.phone),state=coalesce(excluded.state,public.profiles.state),municipality=coalesce(excluded.municipality,public.profiles.municipality),favorite_team=coalesce(excluded.favorite_team,public.profiles.favorite_team),registration_completed=public.profiles.registration_completed or excluded.registration_completed,role=case when v_requested_role in('admin','sponsor') then excluded.role else public.profiles.role end,updated_at=now();
 v_privacy_version:=nullif(new.raw_user_meta_data->>'privacy_accepted_version','');v_terms_version:=nullif(new.raw_user_meta_data->>'terms_accepted_version','');
 if v_privacy_version is not null then insert into public.user_consents(user_id,document_type,document_version,accepted_at,source) values(new.id,'privacy',v_privacy_version,coalesce((new.raw_user_meta_data->>'privacy_accepted_at')::timestamptz,now()),'registro') on conflict do nothing;end if;
 if v_terms_version is not null then insert into public.user_consents(user_id,document_type,document_version,accepted_at,source) values(new.id,'terms',v_terms_version,coalesce((new.raw_user_meta_data->>'terms_accepted_at')::timestamptz,now()),'registro') on conflict do nothing;end if;
 return new;
end $$;
alter function public.handle_new_user() owner to postgres;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of raw_user_meta_data,raw_app_meta_data,email on auth.users for each row execute function public.handle_new_user();

-- Usuarios existentes con todos sus datos se consideran completos.
update public.profiles set registration_completed=true where coalesce(phone,'')<>'' and coalesce(state,'')<>'' and coalesce(municipality,'')<>'' and coalesce(favorite_team,'')<>'';
notify pgrst,'reload schema';
commit;
select document_type,version,is_active from public.legal_documents order by document_type,created_at;
