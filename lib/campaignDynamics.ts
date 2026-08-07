import type { TriviaQuestion } from "@/lib/questions";
import { supabase } from "@/lib/supabase";
import { compressPublicationImage } from "@/lib/image";
import { campaignMatchesLocation, getCurrentCampaignLocation } from "@/lib/campaignTargeting";

export type DynamicCampaignStatus = "draft" | "scheduled" | "active" | "paused" | "finished";
export type DynamicCampaignType = "map" | "brand";

export interface CampaignLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  reward: string;
  rewardCode: string;
  points: number;
  availableUnits: number;
}

interface BaseCampaign {
  id: string;
  type: DynamicCampaignType;
  name: string;
  sponsor: string;
  description: string;
  reward: string;
  rewardCode: string;
  rewardValidityDays: number;
  points: number;
  startDate: string;
  endDate: string;
  status: DynamicCampaignStatus;
  selectedQuestionIds: string[];
  questionCount: number;
  passingPercentage: number;
  questionSeconds: 5;
  cooldownHours: 24;
  createdAt: string;
  coverUrl: string;
  targetState?: string;
  targetMunicipality?: string;
}

export interface MapCampaign extends BaseCampaign { type: "map"; locations: CampaignLocation[]; }
export interface BrandCampaign extends BaseCampaign {
  type: "brand";
  brandName: string;
  locations: CampaignLocation[];
  minimumTotal: number;
  requiredProducts: string[];
  minimumConfidence: number;
  maxTicketImages: 3;
}
export type DynamicCampaign = MapCampaign | BrandCampaign;
export const DYNAMIC_CAMPAIGNS_EVENT = "hrr-dynamic-campaigns-updated";
const ACTIVE_DYNAMIC_CACHE_TTL = 30_000;
const activeDynamicCache = new Map<string, { expiresAt: number; value: DynamicCampaign[] }>();

export interface DynamicCapture {
  id: string;
  campaignId: string;
  campaignName: string;
  type: DynamicCampaignType;
  locationId?: string;
  locationName?: string;
  reward: string;
  rewardCode: string;
  points: number;
  capturedAt: string;
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function dateOnly(value: unknown): string {
  if (!value) return "";
  return new Date(String(value)).toISOString().slice(0, 10);
}

async function mapCampaignRows(rows: Array<Record<string, unknown>>, onlyAvailableLocations = false): Promise<DynamicCampaign[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => String(row.id));
  const [{ data: locations, error: locationsError }, { data: links, error: linksError }, { data: rules, error: rulesError }] = await Promise.all([
    supabase.from("campaign_locations").select("id,campaign_id,name,address,latitude,longitude,radius_meters,reward_name,reward_code,points,reward_units").in("campaign_id", ids).order("created_at"),
    supabase.from("campaign_questions").select("campaign_id,question_id,sort_order").in("campaign_id", ids).order("sort_order"),
    supabase.from("brand_rules").select("campaign_id,expected_brand,minimum_total,required_products,confidence_threshold").in("campaign_id", ids),
  ]);
  if (locationsError) throw locationsError;
  if (linksError) throw linksError;
  if (rulesError) throw rulesError;

  return rows.map((row) => {
    const campaignId = String(row.id);
    const campaignLocations: CampaignLocation[] = (locations ?? [])
      .filter((item) => String(item.campaign_id) === campaignId)
      .filter((item) => !onlyAvailableLocations || Number(item.reward_units ?? 0) > 0)
      .map((item) => ({
        id: String(item.id),
        name: String(item.name),
        address: String(item.address ?? ""),
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        radius: Number(item.radius_meters),
        reward: String(item.reward_name ?? row.name),
        rewardCode: String(item.reward_code ?? ""),
        points: Number(item.points ?? row.points_on_success ?? 0),
        availableUnits: Number(item.reward_units ?? 0),
      }));
    const selectedQuestionIds = (links ?? [])
      .filter((item) => String(item.campaign_id) === campaignId)
      .map((item) => String(item.question_id));
    const rule = (rules ?? []).find((item) => String(item.campaign_id) === campaignId);
    const metadata = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
    const base = {
      id: campaignId,
      type: row.type as DynamicCampaignType,
      name: String(row.name ?? ""),
      sponsor: String(row.sponsor ?? ""),
      description: String(row.description ?? ""),
      reward: campaignLocations[0]?.reward ?? String(row.name ?? "Premio"),
      rewardCode: campaignLocations[0]?.rewardCode ?? "",
      rewardValidityDays: Number(row.reward_validity_days ?? 15),
      points: Number(row.points_on_success ?? 0),
      startDate: dateOnly(row.starts_at),
      endDate: dateOnly(row.ends_at),
      status: row.status as DynamicCampaignStatus,
      selectedQuestionIds,
      questionCount: Number(metadata.questionCount ?? selectedQuestionIds.length ?? 1),
      passingPercentage: Number(row.passing_percentage ?? 100),
      questionSeconds: 5 as const,
      cooldownHours: 24 as const,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      coverUrl: String(row.cover_url ?? metadata.coverUrl ?? ""),
      targetState: String(row.target_state ?? ""),
      targetMunicipality: String(row.target_municipality ?? ""),
    };
    if (row.type === "brand") {
      return {
        ...base,
        type: "brand" as const,
        brandName: String(rule?.expected_brand ?? row.sponsor ?? ""),
        locations: campaignLocations,
        minimumTotal: Number(rule?.minimum_total ?? 0),
        requiredProducts: Array.isArray(rule?.required_products) ? rule.required_products.map(String) : [],
        minimumConfidence: Number(rule?.confidence_threshold ?? 0.8),
        maxTicketImages: 3 as const,
      };
    }
    return { ...base, type: "map" as const, locations: campaignLocations };
  });
}

export async function readDynamicCampaigns(type?: DynamicCampaignType): Promise<DynamicCampaign[]> {
  let query = supabase.from("campaigns").select("*").in("type", type ? [type] : ["map", "brand"]).order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return mapCampaignRows((data ?? []) as Array<Record<string, unknown>>);
}

export async function readActiveDynamicCampaigns(type?: DynamicCampaignType): Promise<DynamicCampaign[]> {
  const cacheKey = type ?? "all";
  const cached = activeDynamicCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const now = new Date().toISOString();
  const query = supabase.from("campaigns")
    .select("id,type,name,sponsor,description,cover_url,status,starts_at,ends_at,points_on_success,passing_percentage,reward_validity_days,created_at,metadata,target_state,target_municipality")
    .eq("status", "active")
    .in("type", type ? [type] : ["map", "brand"])
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at", { ascending: false });
  const [{ data, error }, location] = await Promise.all([query, getCurrentCampaignLocation()]);
  if (error) throw error;
  const filteredRows = ((data ?? []) as Array<Record<string, unknown>>).filter((row) => campaignMatchesLocation(row as { target_state?: string | null; target_municipality?: string | null }, location));
  const value = (await mapCampaignRows(filteredRows, true)).filter((campaign) => campaign.locations.length > 0);
  activeDynamicCache.set(cacheKey, { expiresAt: Date.now() + ACTIVE_DYNAMIC_CACHE_TTL, value });
  return value;
}

export async function saveDynamicCampaign(campaign: DynamicCampaign): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const metadata = { questionCount: campaign.questionCount, questionSeconds: 5, reward: campaign.reward, rewardCode: campaign.rewardCode, coverUrl: campaign.coverUrl };
  const campaignPayload = {
    type: campaign.type,
    name: campaign.name,
    sponsor: campaign.sponsor,
    description: campaign.description,
    cover_url: campaign.coverUrl || null,
    status: campaign.status,
    starts_at: campaign.startDate ? `${campaign.startDate}T00:00:00` : null,
    ends_at: campaign.endDate ? `${campaign.endDate}T23:59:59` : null,
    participation_limit: 1,
    points_on_success: campaign.points,
    points_on_failure: 0,
    passing_percentage: campaign.passingPercentage,
    cooldown_hours: campaign.cooldownHours,
    created_by: userData.user?.id ?? null,
    target_state: campaign.targetState || null,
    target_municipality: campaign.targetMunicipality || null,
    reward_validity_days: Math.max(1, Math.floor(campaign.rewardValidityDays || 15)),
    metadata,
  };
  const isUuid = /^[0-9a-f-]{36}$/i.test(campaign.id);
  const { data: saved, error } = isUuid
    ? await supabase.from("campaigns").update(campaignPayload).eq("id", campaign.id).select("id").single()
    : await supabase.from("campaigns").insert(campaignPayload).select("id").single();
  if (error) throw error;
  const id = String(saved.id);

  await Promise.all([
    supabase.from("campaign_questions").delete().eq("campaign_id", id),
    supabase.from("brand_rules").delete().eq("campaign_id", id),
  ]);

  if (campaign.selectedQuestionIds.length) {
    const { error: linkError } = await supabase.from("campaign_questions").insert(
      campaign.selectedQuestionIds.map((questionId, index) => ({ campaign_id: id, question_id: questionId, sort_order: index + 1 }))
    );
    if (linkError) throw linkError;
  }
  // Sincroniza ubicaciones por ID. No las borra y recrea al editar, evitando duplicados.
  const { data: existingLocations, error: existingLocationsError } = await supabase
    .from("campaign_locations")
    .select("id")
    .eq("campaign_id", id);
  if (existingLocationsError) throw existingLocationsError;

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const locationRows = campaign.locations.map((location) => ({
    ...(uuidPattern.test(location.id) ? { id: location.id } : {}),
    campaign_id: id,
    name: location.name,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    radius_meters: location.radius,
    reward_name: location.reward,
    reward_code: location.rewardCode,
    reward_units: Math.max(0, Math.floor(location.availableUnits || 0)),
    points: location.points,
    is_active: true,
  }));

  if (locationRows.length) {
    const { error: locationError } = await supabase
      .from("campaign_locations")
      .upsert(locationRows, { onConflict: "id" });
    if (locationError) throw locationError;
  }

  const keepIds = new Set(campaign.locations.filter((location) => uuidPattern.test(location.id)).map((location) => location.id));
  const removedIds = (existingLocations ?? []).map((row) => String(row.id)).filter((locationId) => !keepIds.has(locationId));
  if (removedIds.length) {
    const { error: deleteLocationsError } = await supabase.from("campaign_locations").delete().in("id", removedIds);
    if (deleteLocationsError) throw deleteLocationsError;
  }
  if (campaign.type === "brand") {
    const { error: ruleError } = await supabase.from("brand_rules").insert({
      campaign_id: id,
      expected_brand: campaign.brandName,
      minimum_total: campaign.minimumTotal,
      required_products: campaign.requiredProducts,
      confidence_threshold: campaign.minimumConfidence,
      max_images: campaign.maxTicketImages,
      require_location: true,
      automatic_approval: true,
    });
    if (ruleError) throw ruleError;
  }
  activeDynamicCache.clear();
  window.dispatchEvent(new CustomEvent(DYNAMIC_CAMPAIGNS_EVENT));
  return id;
}


export async function uploadDynamicCampaignCover(file: File): Promise<string> {
  const optimized = await compressPublicationImage(file, "portada");
  const safeName = optimized.name.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
  const path = `dynamic/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("campaign-images").upload(path, optimized, {
    upsert: false,
    contentType: optimized.type,
    cacheControl: "31536000",
  });
  if (error) throw error;
  return supabase.storage.from("campaign-images").getPublicUrl(path).data.publicUrl;
}

export function selectCampaignQuestions(campaign: DynamicCampaign, bank: TriviaQuestion[]) {
  const selected = bank.filter((question) => campaign.selectedQuestionIds.includes(question.id));
  return [...selected].sort(() => Math.random() - 0.5).slice(0, Math.max(1, campaign.questionCount));
}

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const radius = 6371000;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function cooldownRemaining(campaignId: string, locationId?: string): Promise<number> {
  let query = supabase.from("participations").select("cooldown_until").eq("campaign_id", campaignId).not("cooldown_until", "is", null).order("cooldown_until", { ascending: false }).limit(1);
  if (locationId) query = query.eq("location_id", locationId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data?.cooldown_until ? Math.max(0, new Date(data.cooldown_until).getTime() - Date.now()) : 0;
}

export async function setMapCooldown(campaignId: string, locationId?: string): Promise<void> {
  await completeDynamicReward({ campaignId, locationId, score: 0, success: false });
}

export async function completeDynamicReward(options: { campaignId: string; locationId?: string; score?: number; success: boolean; metadata?: Record<string, unknown> }) {
  const { data, error } = await supabase.rpc("complete_dynamic_reward", {
    p_campaign_id: options.campaignId,
    p_location_id: options.locationId ?? null,
    p_score: options.score ?? (options.success ? 100 : 0),
    p_success: options.success,
    p_metadata: options.metadata ?? {},
  });
  if (error) throw error;
  activeDynamicCache.clear();
  window.dispatchEvent(new CustomEvent(DYNAMIC_CAMPAIGNS_EVENT));
  return data as { ok: boolean; status: string; pointsAwarded?: number; reward?: string; rewardCode?: string; message?: string; campaignFinished?: boolean };
}

export async function awardDynamicReward(campaign: DynamicCampaign, location?: CampaignLocation) {
  return completeDynamicReward({ campaignId: campaign.id, locationId: location?.id, success: true, score: 100 });
}

export async function readDynamicCaptures(): Promise<DynamicCapture[]> {
  const { data, error } = await supabase
    .from("reward_claims")
    .select("id,campaign_id,reward_name,reward_code,claimed_at,campaigns(name,type),participations(location_id,points_awarded,campaign_locations(name))")
    .order("claimed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((row) => row.campaigns && ["map", "brand"].includes(String((row.campaigns as unknown as { type: string }).type))).map((row) => {
    const campaign = row.campaigns as unknown as { name: string; type: DynamicCampaignType };
    const participation = row.participations as unknown as { location_id?: string; points_awarded?: number; campaign_locations?: { name?: string } } | null;
    return {
      id: String(row.id), campaignId: String(row.campaign_id), campaignName: campaign.name, type: campaign.type,
      locationId: participation?.location_id, locationName: participation?.campaign_locations?.name,
      reward: String(row.reward_name), rewardCode: String(row.reward_code ?? ""), points: Number(participation?.points_awarded ?? 0), capturedAt: String(row.claimed_at),
    };
  });
}
