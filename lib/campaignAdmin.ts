import { supabase } from "@/lib/supabase";

export interface CampaignAdminItem {
  id: string;
  type: "qr" | "map" | "brand";
  name: string;
  sponsor: string;
  description: string;
  coverUrl: string;
  status: "draft" | "scheduled" | "active" | "paused" | "finished";
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export async function readCampaignAdminItems(): Promise<CampaignAdminItem[]> {
  const { data, error } = await supabase.from("campaigns").select("id,type,name,sponsor,description,cover_url,status,starts_at,ends_at,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id), type: row.type as CampaignAdminItem["type"], name: String(row.name), sponsor: String(row.sponsor ?? ""), description: String(row.description ?? ""), coverUrl: String(row.cover_url ?? ""), status: row.status as CampaignAdminItem["status"], startsAt: String(row.starts_at ?? ""), endsAt: String(row.ends_at ?? ""), createdAt: String(row.created_at),
  }));
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}

export async function updateCampaignStatus(id: string, status: CampaignAdminItem["status"]): Promise<void> {
  const { error } = await supabase.from("campaigns").update({ status, ...(status !== "finished" ? { finished_reason: null } : {}) }).eq("id", id);
  if (error) throw error;
}
