import { supabase } from "@/lib/supabase";

export type SeasonStatus = "draft" | "active" | "closed";
export interface Season {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: SeasonStatus;
}

export async function readSeasons(): Promise<Season[]> {
  const { data, error } = await supabase.from("seasons").select("id,name,starts_at,ends_at,status").order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), startsAt: String(row.starts_at), endsAt: String(row.ends_at), status: row.status as SeasonStatus }));
}

export async function readActiveSeason(): Promise<Season | null> {
  const { data, error } = await supabase.from("seasons").select("id,name,starts_at,ends_at,status").eq("status", "active").maybeSingle();
  if (error) throw error;
  return data ? { id: String(data.id), name: String(data.name), startsAt: String(data.starts_at), endsAt: String(data.ends_at), status: data.status as SeasonStatus } : null;
}

export async function saveSeason(input: Omit<Season,"id"> & { id?: string }): Promise<string> {
  const payload = { name: input.name.trim(), starts_at: input.startsAt, ends_at: input.endsAt, status: input.status };
  const { data, error } = input.id
    ? await supabase.from("seasons").update(payload).eq("id", input.id).select("id").single()
    : await supabase.from("seasons").insert(payload).select("id").single();
  if (error) throw error;
  if (input.status === "active") {
    const { error: activateError } = await supabase.rpc("activate_season", { p_season_id: data.id });
    if (activateError) throw activateError;
  }
  return String(data.id);
}

export async function activateSeason(id: string): Promise<void> {
  const { error } = await supabase.rpc("activate_season", { p_season_id: id });
  if (error) throw error;
}

export async function deleteSeason(id: string): Promise<void> {
  const { error } = await supabase.from("seasons").delete().eq("id", id);
  if (error) throw error;
}
