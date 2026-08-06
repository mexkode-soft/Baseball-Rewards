-- Home Run Rewards | instalación modular
-- Archivo: 120_aprobacion_campanas_patrocinador.sql
-- Fuente histórica: 20260803120000_admin_sponsor_campaign_approval.sql
-- Ejecutar únicamente después del archivo anterior.

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
