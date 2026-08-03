create or replace function public.scan_qr(
  p_campaign_id uuid,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path to public, extensions
as $function$
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
    return jsonb_build_object(
      'ok', false,
      'status', 'unauthorized',
      'message', 'Inicia sesión para participar.'
    );
  end if;

  select *
  into v_campaign
  from public.campaigns
  where id = p_campaign_id
    and type = 'qr';

  if not found then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid',
      'message', 'Campaña no encontrada.'
    );
  end if;

  if v_campaign.status <> 'active'
    or (
      v_campaign.starts_at is not null
      and now() < v_campaign.starts_at
    )
    or (
      v_campaign.ends_at is not null
      and now() > v_campaign.ends_at
    )
  then
    return jsonb_build_object(
      'ok', false,
      'status', 'inactive',
      'message', 'La campaña no está activa.'
    );
  end if;

  select *
  into v_code
  from public.qr_codes
  where campaign_id = p_campaign_id
    and token_hash = encode(
      extensions.digest(
        p_token::text,
        'sha256'::text
      ),
      'hex'
    )
    and is_active = true;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid',
      'message', 'El QR no es válido para esta campaña.'
    );
  end if;

  if exists (
    select 1
    from public.participations
    where user_id = v_user
      and campaign_id = p_campaign_id
      and qr_code_id = v_code.id
  ) then
    return jsonb_build_object(
      'ok', false,
      'status', 'duplicate',
      'message', 'Ya escaneaste este código. Busca otro para seguir participando.'
    );
  end if;

  select count(*)
  into v_count
  from public.participations
  where user_id = v_user
    and campaign_id = p_campaign_id
    and qr_code_id is not null;

  if v_count >= greatest(
    1,
    coalesce(
      v_campaign.participation_limit,
      1
    )
  ) then
    return jsonb_build_object(
      'ok', false,
      'status', 'limit_reached',
      'message', 'Ya alcanzaste el límite de intentos de esta campaña.'
    );
  end if;

  if v_code.total_uses >= v_code.max_uses then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid',
      'message', 'Este código ya alcanzó su límite de usos.'
    );
  end if;

  v_points := coalesce(
    v_code.points,
    0
  );

  v_reward :=
    case
      when v_code.is_winner then
        coalesce(
          v_code.reward_name,
          'Premio'
        )
      else null
    end;

  v_reward_code :=
    case
      when v_code.is_winner then
        v_code.reward_code
      else null
    end;

  insert into public.participations (
    campaign_id,
    user_id,
    qr_code_id,
    status,
    points_awarded,
    completed_at,
    metadata
  )
  values (
    p_campaign_id,
    v_user,
    v_code.id,
    'completed',
    v_points,
    now(),
    jsonb_build_object(
      'display_code',
      v_code.display_code,
      'winner',
      v_code.is_winner
    )
  )
  returning id
  into v_participation;

  update public.qr_codes
  set total_uses =
    coalesce(
      total_uses,
      0
    ) + 1
  where id = v_code.id;

  if v_points <> 0 then
    insert into public.point_transactions (
      user_id,
      campaign_id,
      participation_id,
      points,
      transaction_type,
      description
    )
    values (
      v_user,
      p_campaign_id,
      v_participation,
      v_points,
      'qr_scan',
      'Escaneo ' ||
        v_code.display_code
    );
  end if;

  if v_code.is_winner then
    insert into public.reward_claims (
      user_id,
      campaign_id,
      participation_id,
      reward_name,
      reward_code
    )
    values (
      v_user,
      p_campaign_id,
      v_participation,
      v_reward,
      v_reward_code
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status',
      case
        when v_code.is_winner then
          'winner'
        else
          'not_winner'
      end,
    'message',
      case
        when v_code.is_winner then
          '¡Felicidades! Ganaste ' ||
          v_reward ||
          '.'
        else
          'Este código no contiene premio. Sigue participando.'
      end,
    'pointsAwarded',
      v_points,
    'code',
      jsonb_build_object(
        'id',
          v_code.id,
        'label',
          v_code.display_code,
        'isWinner',
          v_code.is_winner,
        'reward',
          coalesce(
            v_reward,
            ''
          ),
        'rewardCode',
          coalesce(
            v_reward_code,
            ''
          ),
        'points',
          v_points
      )
  );
end;
$function$;