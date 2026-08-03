import { supabase } from "@/lib/supabase";

export type AnnouncementIcon = "ticket" | "gift" | "trophy" | "star";

export interface Announcement {
  id: string;
  text: string;
  icon: AnnouncementIcon;
  active: boolean;
  order: number;
}

export const ANNOUNCEMENTS_UPDATED_EVENT = "hrr-announcements-updated";

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "announcement-1",
    text: "2x1 en el partido Águilas vs. Tomateros",
    icon: "ticket",
    active: true,
    order: 1,
  },
  {
    id: "announcement-2",
    text: "Premios sorpresa durante el encuentro",
    icon: "gift",
    active: true,
    order: 2,
  },
];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  throw new Error("El navegador no pudo generar un identificador para el anuncio.");
}

function parseRow(row: Record<string, unknown>, index: number): Announcement {
  const rawBody = String(row.body ?? "");
  let parsed: { text?: string; icon?: AnnouncementIcon; order?: number } = {};

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    parsed = { text: rawBody };
  }

  return {
    id: String(row.id),
    text: parsed.text ?? String(row.title ?? ""),
    icon: parsed.icon ?? "star",
    active: row.is_active !== false,
    order: parsed.order ?? index + 1,
  };
}

export async function readAnnouncements(includeInactive = false): Promise<Announcement[]> {
  let query = supabase
    .from("announcements")
    .select("id,title,body,is_active,published_at")
    .order("published_at", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`No se pudieron cargar los anuncios: ${error.message}`);
  }

  return (data ?? [])
    .map((row, index) => parseRow(row as Record<string, unknown>, index))
    .sort((first, second) => first.order - second.order);
}

export async function saveAnnouncements(items: Announcement[]): Promise<Announcement[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Tu sesión expiró. Vuelve a iniciar sesión para guardar anuncios.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`No fue posible validar tu perfil: ${profileError.message}`);
  }

  if (profile?.role !== "admin") {
    throw new Error("Solo un administrador puede publicar anuncios.");
  }

  const normalized = items.map((item, index) => ({
    ...item,
    id: isUuid(item.id) ? item.id : createUuid(),
    text: item.text.trim(),
    order: index + 1,
  }));

  const { data: existing, error: existingError } = await supabase
    .from("announcements")
    .select("id");

  if (existingError) {
    throw new Error(`No fue posible consultar los anuncios existentes: ${existingError.message}`);
  }

  const now = Date.now();
  const payload = normalized.map((item, index) => ({
    id: item.id,
    title: item.text.slice(0, 120),
    body: JSON.stringify({
      text: item.text,
      icon: item.icon,
      order: item.order,
    }),
    audience: "all",
    is_active: item.active,
    published_at: new Date(now + index * 1000).toISOString(),
    created_by: user.id,
  }));

  if (payload.length > 0) {
    const { error: upsertError } = await supabase
      .from("announcements")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      throw new Error(`No se pudieron guardar los anuncios: ${upsertError.message}`);
    }
  }

  const keepIds = new Set(normalized.map((item) => item.id));
  const removeIds = (existing ?? [])
    .map((row) => String(row.id))
    .filter((id) => !keepIds.has(id));

  if (removeIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("announcements")
      .delete()
      .in("id", removeIds);

    if (deleteError) {
      throw new Error(`Los anuncios se guardaron, pero no fue posible eliminar los anteriores: ${deleteError.message}`);
    }
  }

  window.dispatchEvent(new CustomEvent(ANNOUNCEMENTS_UPDATED_EVENT));

  return normalized;
}
