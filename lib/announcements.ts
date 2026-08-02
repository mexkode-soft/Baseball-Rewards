import { supabase } from "@/lib/supabase";

export type AnnouncementIcon = "ticket" | "gift" | "trophy" | "star";
export interface Announcement { id: string; text: string; icon: AnnouncementIcon; active: boolean; order: number; }
export const ANNOUNCEMENTS_UPDATED_EVENT = "hrr-announcements-updated";

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  { id: "announcement-1", text: "2x1 en el partido Águilas vs. Tomateros", icon: "ticket", active: true, order: 1 },
  { id: "announcement-2", text: "Premios sorpresa durante el encuentro", icon: "gift", active: true, order: 2 },
];

export async function readAnnouncements(includeInactive = false): Promise<Announcement[]> {
  let query = supabase.from("announcements").select("*").order("published_at", { ascending: false });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row, index) => {
    const body = String(row.body ?? "");
    let parsed: { text?: string; icon?: AnnouncementIcon; order?: number } = {};
    try { parsed = JSON.parse(body); } catch { parsed = { text: body }; }
    return {
      id: String(row.id),
      text: parsed.text ?? String(row.title ?? ""),
      icon: parsed.icon ?? "star",
      active: row.is_active !== false,
      order: parsed.order ?? index + 1,
    };
  }).sort((a, b) => a.order - b.order);
}

export async function saveAnnouncements(items: Announcement[]): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const ids = items.filter((item) => /^[0-9a-f-]{36}$/i.test(item.id)).map((item) => item.id);
  const { data: existing, error: readError } = await supabase.from("announcements").select("id");
  if (readError) throw readError;
  const removeIds = (existing ?? []).map((row) => String(row.id)).filter((id) => !ids.includes(id));
  if (removeIds.length) {
    const { error } = await supabase.from("announcements").delete().in("id", removeIds);
    if (error) throw error;
  }
  for (const [index, item] of items.entries()) {
    const payload = {
      title: item.text.slice(0, 120),
      body: JSON.stringify({ text: item.text, icon: item.icon, order: index + 1 }),
      audience: "all",
      is_active: item.active,
      published_at: new Date().toISOString(),
      created_by: userData.user?.id ?? null,
    };
    const request = /^[0-9a-f-]{36}$/i.test(item.id)
      ? supabase.from("announcements").update(payload).eq("id", item.id)
      : supabase.from("announcements").insert(payload);
    const { error } = await request;
    if (error) throw error;
  }
  window.dispatchEvent(new CustomEvent(ANNOUNCEMENTS_UPDATED_EVENT));
}
