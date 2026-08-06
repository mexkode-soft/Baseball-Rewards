import { supabase } from "@/lib/supabase";

export interface BroadcastRecord {
  id: string;
  title: string;
  audience: string;
  type: string;
  date: string;
  recipients: number;
  status: string;
}

export async function readBroadcasts(): Promise<BroadcastRecord[]> {
  const { data, error } = await supabase
    .from("broadcasts")
    .select(
      "id,title,audience,message_type,sent_at,scheduled_at,created_at,recipient_count,status",
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const audience = (row.audience ?? {}) as {
      type?: string;
      state?: string;
      municipality?: string;
      level?: string;
      amount?: number;
    };

    const locationLabel = audience.municipality
      ? `${audience.municipality}, ${audience.state ?? ""}`
      : audience.state ?? "una ubicación";

    const label =
      audience.type === "location"
        ? `Usuarios de ${locationLabel}`
        : audience.type === "custom"
          ? `Nivel ${audience.level ?? ""} · ${locationLabel}`
          : audience.type === "level"
            ? `Nivel ${audience.level ?? ""}`
            : audience.type === "random"
              ? `${audience.amount ?? 0} usuarios aleatorios`
              : audience.type === "sponsors"
                ? "Todos los patrocinadores"
                : audience.type === "specific"
                  ? "Usuarios seleccionados"
                  : "Toda la comunidad";

    return {
      id: String(row.id),
      title: String(row.title),
      audience: label,
      type: String(row.message_type),
      date: String(row.sent_at ?? row.scheduled_at ?? row.created_at),
      recipients: Number(row.recipient_count ?? 0),
      status: String(row.status),
    };
  });
}

export interface BroadcastSendResult {
  recipients: number;
  pushQueued: boolean;
  pushProcessed: boolean;
  pushMessage?: string;
}

function buildSuccessMessage(recipients: number): string {
  return `Notificación enviada a ${recipients} ${
    recipients === 1 ? "usuario" : "usuarios"
  }.`;
}

export async function sendBroadcast(input: {
  title: string;
  body: string;
  messageType: string;
  priority: string;
  audienceType: string;
  level?: string;
  state?: string;
  municipality?: string;
  randomAmount?: number;
  actionUrl?: string;
  imageUrl?: string;
  userIds?: string[];
  idempotencyKey: string;
}): Promise<BroadcastSendResult> {
  const audience = {
    type: input.audienceType,
    level: input.level,
    state: input.state,
    municipality: input.municipality || null,
    amount: input.randomAmount,
    userIds: (input.userIds ?? []).slice(0, 10),
  };

  const { data, error } = await supabase.rpc("publicar_comunicado_seguro", {
    p_payload: {
      title: input.title,
      body: input.body,
      messageType: input.messageType,
      priority: input.priority,
      audience,
      actionUrl: input.actionUrl ?? "/usuario",
      imageUrl: input.imageUrl ?? null,
      idempotencyKey: input.idempotencyKey,
    },
  });

  if (error) {
    throw new Error(`No se pudo crear el comunicado: ${error.message}`);
  }

  const result = data as {
    broadcast_id?: string;
    recipients?: number;
    push_job_id?: string | null;
  } | null;

  const recipients = Number(result?.recipients ?? 0);
  const pushJobId = result?.push_job_id ?? null;

  if (recipients === 0) {
    return {
      recipients,
      pushQueued: Boolean(pushJobId),
      pushProcessed: false,
      pushMessage: "No se encontraron destinatarios elegibles.",
    };
  }

  const successMessage = buildSuccessMessage(recipients);

  if (!pushJobId) {
    return {
      recipients,
      pushQueued: false,
      pushProcessed: false,
      pushMessage: successMessage,
    };
  }

  try {
    const { error: pushError } = await supabase.functions.invoke(
      "send-push-batch",
      {
        body: { jobId: pushJobId },
      },
    );

    if (pushError) {
      console.warn(
        "La notificación interna fue creada, pero el push quedó pendiente.",
        pushError,
      );

      return {
        recipients,
        pushQueued: true,
        pushProcessed: false,
        pushMessage: successMessage,
      };
    }

    return {
      recipients,
      pushQueued: true,
      pushProcessed: true,
      pushMessage: successMessage,
    };
  } catch (pushError) {
    console.warn(
      "La notificación interna fue creada, pero el push seguirá pendiente.",
      pushError,
    );

    return {
      recipients,
      pushQueued: true,
      pushProcessed: false,
      pushMessage: successMessage,
    };
  }
}
