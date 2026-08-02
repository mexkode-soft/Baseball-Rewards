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
  const { data, error } = await supabase.from("broadcasts").select("*").order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const audience = (row.audience ?? {}) as { type?: string; state?: string; level?: string; amount?: number };
    const label = audience.type === "location" ? `Usuarios de ${audience.state ?? "una ubicación"}`
      : audience.type === "level" ? `Nivel ${audience.level ?? ""}`
      : audience.type === "random" ? `${audience.amount ?? 0} usuarios aleatorios`
      : "Toda la comunidad";
    return {
      id: String(row.id), title: String(row.title), audience: label, type: String(row.message_type),
      date: String(row.sent_at ?? row.scheduled_at ?? row.created_at), recipients: Number(row.recipient_count ?? 0), status: String(row.status),
    };
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
}): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  let query = supabase.from("profiles").select("id,total_points,state").eq("role", "usuario");
  if (input.audienceType === "location" && input.state) query = query.eq("state", input.state);
  const { data: profiles, error: profileError } = await query;
  if (profileError) throw profileError;
  let targets = profiles ?? [];
  if (input.audienceType === "level" && input.level) {
    const { data: levels, error: levelError } = await supabase.from("levels").select("name,minimum_points,maximum_points").eq("name", input.level).maybeSingle();
    if (levelError) throw levelError;
    if (levels) targets = targets.filter((profile) => Number(profile.total_points) >= Number(levels.minimum_points) && (levels.maximum_points === null || Number(profile.total_points) <= Number(levels.maximum_points)));
  }
  if (input.audienceType === "random") {
    targets = [...targets].sort(() => Math.random() - 0.5).slice(0, Math.max(1, input.randomAmount ?? 1));
  }
  const audience = { type: input.audienceType, level: input.level, state: input.state, amount: input.randomAmount };
  const { data: broadcast, error } = await supabase.from("broadcasts").insert({
    title: input.title, body: input.body, message_type: input.messageType, priority: input.priority,
    audience, status: "sent", recipient_count: targets.length, sent_at: new Date().toISOString(), created_by: userData.user?.id ?? null,
  }).select("id").single();
  if (error) throw error;
  if (targets.length) {
    const { error: notificationError } = await supabase.from("notifications").insert(targets.map((profile) => ({
      user_id: profile.id, title: input.title, body: input.body, type: input.messageType,
    })));
    if (notificationError) throw notificationError;
  }
  return targets.length;
}
