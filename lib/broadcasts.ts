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
  const { data, error } = await supabase.from("broadcasts").select("id,title,audience,message_type,sent_at,scheduled_at,created_at,recipient_count,status").order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const audience = (row.audience ?? {}) as { type?: string; state?: string; level?: string; amount?: number };
    const label = audience.type === "location" ? `Usuarios de ${audience.state ?? "una ubicación"}`
      : audience.type === "level" ? `Nivel ${audience.level ?? ""}`
      : audience.type === "random" ? `${audience.amount ?? 0} usuarios aleatorios`
      : audience.type === "sponsors" ? "Todos los patrocinadores" : audience.type === "specific" ? "Usuarios seleccionados" : "Toda la comunidad";
    return { id: String(row.id), title: String(row.title), audience: label, type: String(row.message_type), date: String(row.sent_at ?? row.scheduled_at ?? row.created_at), recipients: Number(row.recipient_count ?? 0), status: String(row.status) };
  });
}

export async function sendBroadcast(input: {
  title: string;
  body: string;
  messageType: string;
  priority: string;
  audienceType: string;
  level?: string;
  state?: string;
  randomAmount?: number;
  actionUrl?: string;
  imageUrl?: string;
  userIds?: string[];
}): Promise<number> {
  const audience = { type: input.audienceType, level: input.level, state: input.state, amount: input.randomAmount, userIds: (input.userIds ?? []).slice(0, 10) };
  const { data, error } = await supabase.rpc("publish_broadcast", {
    p_title: input.title,
    p_body: input.body,
    p_message_type: input.messageType,
    p_priority: input.priority,
    p_audience: audience,
    p_action_url: input.actionUrl ?? "/usuario",
    p_image_url: input.imageUrl ?? null,
  });
  if (error) throw error;
  const result = data as { broadcast_id?: string; recipients?: number } | null;

  // Dispara un lote inmediato. La cola queda pendiente para cron/worker si faltan destinatarios.
  try {
    await supabase.functions.invoke("send-push-batch", { body: {} });
  } catch (pushError) {
    console.warn("El comunicado se guardó; el push seguirá pendiente en la cola.", pushError);
  }
  return Number(result?.recipients ?? 0);
}
