-- Home Run Rewards | métricas administrativas y notificaciones de revisión
-- Archivo: 350_metricas_admin_y_notificaciones_revision.sql
-- Ejecutar después de: 340_envio_campanas_patrocinador.sql
-- Idempotente: puede ejecutarse nuevamente.

begin;

-- ---------------------------------------------------------------------------
-- 1. Acceso administrativo a métricas y presupuestos de todas las campañas
-- ---------------------------------------------------------------------------

grant select on table public.campaign_metrics_daily to authenticated;
grant select on table public.campaign_budgets to authenticated;

drop policy if exists "administradores consultan todas las metricas" on public.campaign_metrics_daily;
create policy "administradores consultan todas las metricas"
on public.campaign_metrics_daily
for select
to authenticated
using (public.is_admin());

drop policy if exists "administradores consultan todos los presupuestos" on public.campaign_budgets;
create policy "administradores consultan todos los presupuestos"
on public.campaign_budgets
for select
to authenticated
using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Avisar a todos los administradores cuando una campaña llega a revisión
-- ---------------------------------------------------------------------------

create or replace function public.notify_admins_sponsor_campaign_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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
  left join public.sponsor_organizations o on o.id = new.organization_id
  where c.id = new.campaign_id;

  insert into public.notifications (
    user_id,
    title,
    body,
    type,
    action_url
  )
  select
    p.id,
    'Campaña pendiente de revisión',
    coalesce(v_org_name, 'Un patrocinador') || ' envió la campaña “' || coalesce(v_campaign_name, 'Sin nombre') || '” para aprobación.',
    'sponsor_campaign_review',
    '/admin/campanas-patrocinadores?campaign=' || new.campaign_id::text
  from public.profiles p
  where p.role::text = 'admin';

  return new;
end;
$$;

alter function public.notify_admins_sponsor_campaign_review() owner to postgres;

drop trigger if exists trg_notify_admins_sponsor_campaign_review on public.campaign_sponsors;
create trigger trg_notify_admins_sponsor_campaign_review
after insert or update of approval_status
on public.campaign_sponsors
for each row
execute function public.notify_admins_sponsor_campaign_review();

-- ---------------------------------------------------------------------------
-- 3. Revisar campaña y notificar al patrocinador que la envió
-- ---------------------------------------------------------------------------

create or replace function public.review_sponsor_campaign(
  p_campaign_id uuid,
  p_decision text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_status public.campaign_status;
  v_title text;
  v_body text;
  v_action_url text := '/patrocinador/campanas';
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

    v_title := 'Campaña aprobada';
    v_body := 'La campaña “' || v_campaign.name || '” fue aprobada.';
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

    v_title := case
      when p_decision = 'changes_requested' then 'Cambios solicitados en tu campaña'
      else 'Campaña rechazada'
    end;

    v_body := v_title || ': “' || v_campaign.name || '”.'
      || case
           when nullif(trim(coalesce(p_notes, '')), '') is not null
             then ' Comentario: ' || trim(p_notes)
           else ''
         end;
  end if;

  -- Notificar al creador y a todos los integrantes de la organización,
  -- sin duplicar destinatarios.
  insert into public.notifications (
    user_id,
    title,
    body,
    type,
    action_url
  )
  select distinct recipient.user_id, v_title, v_body, 'sponsor_campaign_result', v_action_url
  from (
    select v_campaign.created_by as user_id
    union
    select sm.user_id
    from public.campaign_sponsors cs
    join public.sponsor_members sm
      on sm.organization_id = cs.organization_id
    where cs.campaign_id = p_campaign_id
  ) recipient
  where recipient.user_id is not null;

  return jsonb_build_object(
    'ok', true,
    'campaignId', p_campaign_id,
    'decision', p_decision,
    'campaignStatus', (
      select status::text
      from public.campaigns
      where id = p_campaign_id
    )
  );
end;
$$;

alter function public.review_sponsor_campaign(uuid, text, text) owner to postgres;
revoke all on function public.review_sponsor_campaign(uuid, text, text) from public;
grant execute on function public.review_sponsor_campaign(uuid, text, text) to authenticated;
grant execute on function public.review_sponsor_campaign(uuid, text, text) to service_role;

notify pgrst, 'reload schema';

commit;

-- Verificación
select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'notify_admins_sponsor_campaign_review',
    'review_sponsor_campaign'
  )
order by routine_name;
