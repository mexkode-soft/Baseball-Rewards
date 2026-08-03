-- Flujo manual de validación de tickets para pilotos comerciales.
-- El usuario carga el comprobante y un administrador aprueba o rechaza.

create index if not exists ticket_submissions_manual_queue_idx
  on public.ticket_submissions(status, created_at desc)
  where status in ('pending','manual_review');

create index if not exists ticket_images_submission_sort_idx
  on public.ticket_images(submission_id, sort_order);

-- Permite que el administrador consulte todas las imágenes de tickets.
drop policy if exists ticket_images_admin_read on public.ticket_images;
create policy ticket_images_admin_read
  on public.ticket_images
  for select
  using (public.is_admin());

create or replace function public.review_ticket_submission(
  p_submission_id uuid,
  p_decision text,
  p_reason text default null,
  p_purchase_total numeric default null,
  p_ticket_number text default null,
  p_purchase_date date default null,
  p_merchant_name text default null,
  p_branch_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_admin uuid := auth.uid();
  v_ticket public.ticket_submissions%rowtype;
  v_campaign public.campaigns%rowtype;
  v_location public.campaign_locations%rowtype;
  v_participation uuid;
  v_points integer;
  v_reward text;
  v_reward_code text;
  v_status public.ticket_status;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede revisar tickets.';
  end if;

  if p_decision not in ('approved','rejected') then
    raise exception 'La decisión debe ser approved o rejected.';
  end if;

  select * into v_ticket
  from public.ticket_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Ticket no encontrado.';
  end if;

  if v_ticket.status not in ('pending','manual_review') then
    return jsonb_build_object(
      'ok', false,
      'status', v_ticket.status,
      'message', 'Este ticket ya fue revisado.'
    );
  end if;

  select * into v_campaign
  from public.campaigns
  where id = v_ticket.campaign_id
    and type = 'brand';

  if not found then
    raise exception 'Campaña de ticket no encontrada.';
  end if;

  select * into v_location
  from public.campaign_locations
  where campaign_id = v_ticket.campaign_id
    and is_active
  order by created_at
  limit 1;

  v_status := case when p_decision = 'approved' then 'approved'::public.ticket_status else 'rejected'::public.ticket_status end;

  update public.ticket_submissions
  set
    status = v_status,
    validation_reason = coalesce(nullif(trim(p_reason), ''), case when p_decision='approved' then 'Ticket validado manualmente.' else 'Ticket rechazado manualmente.' end),
    purchase_total = coalesce(p_purchase_total, purchase_total),
    ticket_number = coalesce(nullif(trim(p_ticket_number), ''), ticket_number),
    purchase_date = coalesce(p_purchase_date, purchase_date),
    merchant_name = coalesce(nullif(trim(p_merchant_name), ''), merchant_name),
    branch_name = coalesce(nullif(trim(p_branch_name), ''), branch_name),
    reviewed_at = now(),
    reviewed_by = v_admin
  where id = p_submission_id
  returning * into v_ticket;

  if p_decision = 'approved' then
    if v_ticket.purchase_total is null or v_ticket.purchase_total < 0 then
      raise exception 'Captura un monto válido antes de aprobar.';
    end if;

    if not exists (
      select 1
      from public.participations p
      where p.user_id = v_ticket.user_id
        and p.campaign_id = v_ticket.campaign_id
        and p.metadata ->> 'ticket_submission_id' = v_ticket.id::text
    ) then
      v_points := coalesce(v_location.points, v_campaign.points_on_success, 0);
      v_reward := coalesce(v_location.reward_name, v_campaign.metadata ->> 'reward', v_campaign.name);
      v_reward_code := coalesce(v_location.reward_code, v_campaign.metadata ->> 'rewardCode');

      insert into public.participations(
        campaign_id,
        user_id,
        location_id,
        status,
        score,
        points_awarded,
        completed_at,
        metadata
      )
      values(
        v_ticket.campaign_id,
        v_ticket.user_id,
        v_location.id,
        'completed',
        100,
        v_points,
        now(),
        jsonb_build_object(
          'ticket_submission_id', v_ticket.id,
          'manual_review', true,
          'purchase_total', v_ticket.purchase_total
        )
      )
      returning id into v_participation;

      if v_points <> 0 then
        insert into public.point_transactions(
          user_id,
          campaign_id,
          participation_id,
          points,
          transaction_type,
          description
        )
        values(
          v_ticket.user_id,
          v_ticket.campaign_id,
          v_participation,
          v_points,
          'ticket_approved',
          'Ticket aprobado: ' || v_campaign.name
        );
      end if;

      if v_reward is not null then
        insert into public.reward_claims(
          user_id,
          campaign_id,
          participation_id,
          reward_name,
          reward_code
        )
        values(
          v_ticket.user_id,
          v_ticket.campaign_id,
          v_participation,
          v_reward,
          v_reward_code
        );
      end if;
    end if;

    insert into public.notifications(user_id,title,body,type,action_url)
    values(
      v_ticket.user_id,
      'Ticket aprobado',
      'Tu ticket de ' || v_campaign.name || ' fue aprobado. Ya puedes consultar tus puntos y recompensas.',
      'ticket_approved',
      '/usuario/recompensas'
    );
  else
    insert into public.notifications(user_id,title,body,type,action_url)
    values(
      v_ticket.user_id,
      'Ticket rechazado',
      'Tu ticket de ' || v_campaign.name || ' fue rechazado. Motivo: ' || coalesce(nullif(trim(p_reason),''),'No cumple las reglas de la campaña.'),
      'ticket_rejected',
      '/usuario/cazar-recompensas/marca'
    );
  end if;

  perform public.refresh_campaign_metric_day(v_ticket.campaign_id, v_ticket.created_at::date);

  return jsonb_build_object(
    'ok', true,
    'status', v_status,
    'submissionId', v_ticket.id,
    'message', case when p_decision='approved' then 'Ticket aprobado correctamente.' else 'Ticket rechazado correctamente.' end
  );
end;
$function$;

grant execute on function public.review_ticket_submission(uuid,text,text,numeric,text,date,text,text) to authenticated;

create or replace function public.notify_admins_new_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_campaign_name text;
begin
  select name into v_campaign_name from public.campaigns where id = new.campaign_id;

  insert into public.notifications(user_id,title,body,type,action_url)
  select
    p.id,
    'Nuevo ticket por revisar',
    'Se recibió un ticket para la campaña ' || coalesce(v_campaign_name,'Campaña') || '.',
    'ticket_review',
    '/admin/tickets'
  from public.profiles p
  where p.role = 'admin';

  return new;
end;
$function$;

drop trigger if exists ticket_notify_admins on public.ticket_submissions;
create trigger ticket_notify_admins
after insert on public.ticket_submissions
for each row
when (new.status in ('pending','manual_review'))
execute function public.notify_admins_new_ticket();
