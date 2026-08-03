import { supabase } from "@/lib/supabase";

export type QrCampaignStatus = "draft" | "scheduled" | "active";
export interface QrCodeRecord {
  id: string;
  token: string;
  payload: string;
  label: string;
  isWinner: boolean;
  reward: string;
  rewardCode?: string;
  points: number;
  scannedBy: string[];
  totalScans: number;
}
export interface QrCampaign {
  id: string;
  type: "qr";
  name: string;
  sponsor: string;
  description: string;
  coverUrl?: string;
  startDate: string;
  endDate: string;
  status: QrCampaignStatus;
  attemptsPerUser: number;
  participationPoints: number;
  winnerPoints: number;
  reward: string;
  createdAt: string;
  codes: QrCodeRecord[];
}
export interface QrScanResult {
  ok: boolean;
  status: "winner" | "not_winner" | "invalid" | "duplicate" | "limit_reached" | "inactive" | "wrong_campaign" | "unauthorized";
  message: string;
  campaign?: QrCampaign;
  code?: QrCodeRecord;
  pointsAwarded?: number;
}
export interface QrCapture {
  id: string;
  campaignId: string;
  campaignName: string;
  sponsor: string;
  codeId: string;
  codeLabel: string;
  isWinner: boolean;
  reward: string;
  points: number;
  capturedAt: string;
}

export const QR_CAMPAIGNS_EVENT = "hrr-qr-campaigns-updated";

function randomPart(length = 16) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(36).padStart(2, "0")).join("").slice(0, length).toUpperCase();
}
export function createId(prefix: string) { return prefix === "campaign" && typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${prefix}-${Date.now().toString(36)}-${randomPart(8)}`; }
export function createQrPayload(campaignId: string, token: string) { return `HRR|QR|${campaignId}|${token}`; }

export function generateQrCodes(options: { campaignId: string; total: number; winners: number; reward: string; participationPoints: number; winnerPoints: number; }): QrCodeRecord[] {
  const total = Math.max(1, Math.floor(options.total));
  const winners = Math.max(0, Math.min(total, Math.floor(options.winners)));
  const winnerIndexes = new Set<number>();
  while (winnerIndexes.size < winners) winnerIndexes.add(Math.floor(Math.random() * total));
  return Array.from({ length: total }, (_, index) => {
    const token = randomPart(24);
    const isWinner = winnerIndexes.has(index);
    return {
      id: createId("code"), token, payload: createQrPayload(options.campaignId, token),
      label: `QR-${String(index + 1).padStart(3, "0")}`, isWinner,
      reward: isWinner ? options.reward : "", rewardCode: isWinner ? `${options.campaignId.slice(-6).toUpperCase()}-${index + 1}` : "",
      points: isWinner ? options.winnerPoints : options.participationPoints, scannedBy: [], totalScans: 0,
    };
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function dateOnly(value: unknown) { return value ? new Date(String(value)).toISOString().slice(0, 10) : ""; }

export async function saveQrCampaign(campaign: QrCampaign): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const isUuid = /^[0-9a-f-]{36}$/i.test(campaign.id);
  const payload = {
    type: "qr", name: campaign.name, sponsor: campaign.sponsor, description: campaign.description, cover_url: campaign.coverUrl || null,
    status: campaign.status, starts_at: campaign.startDate ? `${campaign.startDate}T00:00:00` : null,
    ends_at: campaign.endDate ? `${campaign.endDate}T23:59:59` : null,
    participation_limit: Math.min(Math.max(1, campaign.attemptsPerUser), campaign.codes.length),
    points_on_success: campaign.winnerPoints, points_on_failure: campaign.participationPoints,
    passing_percentage: 100, cooldown_hours: 0, created_by: userData.user?.id ?? null,
    metadata: { reward: campaign.reward },
  };
  const { data: saved, error } = isUuid
    ? await supabase.from("campaigns").upsert({ id: campaign.id, ...payload }, { onConflict: "id" }).select("id").single()
    : await supabase.from("campaigns").insert(payload).select("id").single();
  if (error) throw error;
  const id = String(saved.id);
  const { error: deleteError } = await supabase.from("qr_codes").delete().eq("campaign_id", id);
  if (deleteError) throw deleteError;
  const codeRows = await Promise.all(campaign.codes.map(async (code) => ({
    campaign_id: id,
    token_hash: await sha256(code.token),
    token_value: code.token,
    display_code: code.label,
    is_winner: code.isWinner,
    reward_name: code.reward || null,
    reward_code: code.rewardCode || null,
    points: code.points,
    max_uses: 1,
    total_uses: 0,
    is_active: true,
  })));
  const { error: codeError } = await supabase.from("qr_codes").insert(codeRows);
  if (codeError) throw codeError;
  window.dispatchEvent(new CustomEvent(QR_CAMPAIGNS_EVENT));
  return id;
}

export async function readQrCampaigns(): Promise<QrCampaign[]> {
  const { data: campaigns, error } = await supabase.from("campaigns").select("*").eq("type", "qr").order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (campaigns ?? []).map((item) => String(item.id));
  const { data: codes, error: codeError } = ids.length
    ? await supabase.from("qr_codes").select("id,campaign_id,display_code,is_winner,reward_name,reward_code,points,total_uses,token_value").in("campaign_id", ids).order("created_at")
    : { data: [], error: null };
  if (codeError) throw codeError;
  return (campaigns ?? []).map((campaign) => ({
    id: String(campaign.id), type: "qr", name: String(campaign.name), sponsor: String(campaign.sponsor ?? ""), description: String(campaign.description ?? ""), coverUrl: String(campaign.cover_url ?? ""),
    startDate: dateOnly(campaign.starts_at), endDate: dateOnly(campaign.ends_at), status: campaign.status as QrCampaignStatus,
    attemptsPerUser: Number(campaign.participation_limit), participationPoints: Number(campaign.points_on_failure), winnerPoints: Number(campaign.points_on_success),
    reward: String((campaign.metadata as { reward?: string } | null)?.reward ?? "Premio"), createdAt: String(campaign.created_at),
    codes: (codes ?? []).filter((code) => code.campaign_id === campaign.id).map((code) => ({
      id: String(code.id),
      token: String(code.token_value ?? ""),
      payload: code.token_value ? createQrPayload(String(campaign.id), String(code.token_value)) : "",
      label: String(code.display_code), isWinner: Boolean(code.is_winner),
      reward: String(code.reward_name ?? ""), rewardCode: String(code.reward_code ?? ""), points: Number(code.points), scannedBy: [], totalScans: Number(code.total_uses),
    })),
  }));
}

export async function readActiveQrCampaigns(): Promise<QrCampaign[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("active_qr_campaign_summary").select("*").eq("status", "active")
    .or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((campaign) => ({
    id: String(campaign.id), type: "qr", name: String(campaign.name), sponsor: String(campaign.sponsor ?? ""), description: String(campaign.description ?? ""), coverUrl: String(campaign.cover_url ?? ""),
    startDate: dateOnly(campaign.starts_at), endDate: dateOnly(campaign.ends_at), status: "active",
    attemptsPerUser: Number(campaign.participation_limit), participationPoints: Number(campaign.points_on_failure), winnerPoints: Number(campaign.points_on_success),
    reward: "Premio sorpresa", createdAt: String(campaign.created_at), codes: Array.from({ length: Number(campaign.code_count ?? 0) }, (_, index) => ({
      id: `summary-${index}`, token: "", payload: "", label: `QR-${index + 1}`, isWinner: false, reward: "", points: 0, scannedBy: [], totalScans: 0,
    })),
  }));
}

export async function validateQrPayload(payload: string, expectedCampaignId?: string): Promise<QrScanResult> {
  const [brand, type, campaignId, token] = payload.trim().split("|");
  if (brand !== "HRR" || type !== "QR" || !campaignId || !token) return { ok: false, status: "invalid", message: "Este código no pertenece a Home Run Rewards." };
  if (expectedCampaignId && campaignId !== expectedCampaignId) return { ok: false, status: "wrong_campaign", message: "Este QR pertenece a otra campaña." };
  const { data, error } = await supabase.rpc("scan_qr", { p_campaign_id: campaignId, p_token: token });
  if (error) {
    return {
      ok: false,
      status: "invalid",
      message: error.message || "No fue posible validar este código QR.",
    };
  }
  return data as QrScanResult;
}

export async function readQrCaptures(): Promise<QrCapture[]> {
  const { data, error } = await supabase.from("participations")
    .select("id,campaign_id,qr_code_id,points_awarded,completed_at,metadata,campaigns(name,sponsor,type),qr_codes(display_code,is_winner,reward_name)")
    .not("qr_code_id", "is", null).order("completed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const campaign = row.campaigns as unknown as { name: string; sponsor?: string };
    const code = row.qr_codes as unknown as { display_code: string; is_winner: boolean; reward_name?: string };
    return {
      id: String(row.id), campaignId: String(row.campaign_id), campaignName: campaign.name, sponsor: campaign.sponsor ?? "",
      codeId: String(row.qr_code_id), codeLabel: code.display_code, isWinner: code.is_winner, reward: code.reward_name ?? "",
      points: Number(row.points_awarded), capturedAt: String(row.completed_at),
    };
  });
}

export async function readDemoPoints(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;
  const { data, error } = await supabase.from("profiles").select("total_points").eq("id", userData.user.id).single();
  if (error) throw error;
  return Number(data.total_points ?? 0);
}
