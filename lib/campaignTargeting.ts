import { supabase } from "@/lib/supabase";

export type CampaignTarget = { targetState?: string; targetMunicipality?: string };

export async function getCurrentCampaignLocation(): Promise<{ state: string; municipality: string; role: string } | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("state,municipality,role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    state: String(data.state ?? ""),
    municipality: String(data.municipality ?? ""),
    role: String(data.role ?? "usuario"),
  };
}

export function campaignMatchesLocation(
  campaign: { target_state?: string | null; target_municipality?: string | null },
  location: { state: string; municipality: string; role: string } | null,
): boolean {
  if (!location || location.role === "admin") return true;
  const targetState = String(campaign.target_state ?? "").trim();
  const targetMunicipality = String(campaign.target_municipality ?? "").trim();
  if (!targetState) return true;
  if (!location.state || location.state !== targetState) return false;
  if (!targetMunicipality) return true;
  return Boolean(location.municipality) && location.municipality === targetMunicipality;
}
