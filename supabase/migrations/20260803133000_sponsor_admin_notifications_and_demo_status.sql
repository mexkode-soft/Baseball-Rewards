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
