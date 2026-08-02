import type { TriviaQuestion } from "@/lib/questions";

export type DynamicCampaignStatus = "draft" | "scheduled" | "active";
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
  points: number;
  startDate: string;
  endDate: string;
  status: DynamicCampaignStatus;
  selectedQuestionIds: number[];
  questionCount: number;
  passingPercentage: number;
  questionSeconds: 5;
  cooldownHours: 24;
  createdAt: string;
}

export interface MapCampaign extends BaseCampaign {
  type: "map";
  locations: CampaignLocation[];
}

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

const KEY = "hrr-dynamic-campaigns-v1";
export const DYNAMIC_CAMPAIGNS_EVENT = "hrr-dynamic-campaigns-updated";
export const DYNAMIC_COOLDOWN_STORAGE_KEY = "hrr-map-cooldowns-v1";
const CAPTURES_KEY = "hrr-dynamic-captures-v1";

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

export function readDynamicCampaigns(): DynamicCampaign[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as DynamicCampaign[];
    return parsed.map((campaign) => ({
      ...campaign,
      locations: campaign.locations.map((location) => ({
        ...location,
        reward: location.reward ?? campaign.reward,
        rewardCode: location.rewardCode ?? campaign.rewardCode,
        points: location.points ?? campaign.points,
        availableUnits: location.availableUnits ?? 1,
      })),
    }));
  } catch {
    return [];
  }
}

export function saveDynamicCampaign(campaign: DynamicCampaign) {
  const all = readDynamicCampaigns();
  const index = all.findIndex((item) => item.id === campaign.id);
  if (index >= 0) all[index] = campaign;
  else all.unshift(campaign);
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent(DYNAMIC_CAMPAIGNS_EVENT));
}

export function readActiveDynamicCampaigns(type?: DynamicCampaignType) {
  const now = new Date();
  return readDynamicCampaigns().filter((campaign) => {
    if (campaign.status !== "active") return false;
    if (type && campaign.type !== type) return false;
    if (campaign.startDate && now < new Date(`${campaign.startDate}T00:00:00`)) return false;
    if (campaign.endDate && now > new Date(`${campaign.endDate}T23:59:59`)) return false;
    return true;
  });
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

export function setMapCooldown(campaignId: string, locationId?: string) {
  const current = readCooldowns();
  current[`${campaignId}:${locationId ?? "campaign"}`] = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  localStorage.setItem(DYNAMIC_COOLDOWN_STORAGE_KEY, JSON.stringify(current));
}

export function readCooldowns(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(DYNAMIC_COOLDOWN_STORAGE_KEY) ?? "{}") as Record<string, string>; }
  catch { return {}; }
}

export function cooldownRemaining(campaignId: string, locationId?: string) {
  const until = readCooldowns()[`${campaignId}:${locationId ?? "campaign"}`];
  return until ? Math.max(0, new Date(until).getTime() - Date.now()) : 0;
}

export function awardDynamicReward(campaign: DynamicCampaign, location?: CampaignLocation) {
  const reward = location?.reward || campaign.reward;
  const rewardCode = location?.rewardCode || campaign.rewardCode;
  const pointsToAward = location?.points ?? campaign.points;
  const capture: DynamicCapture = {
    id: makeId("capture"),
    campaignId: campaign.id,
    campaignName: campaign.name,
    type: campaign.type,
    locationId: location?.id,
    locationName: location?.name,
    reward,
    rewardCode,
    points: pointsToAward,
    capturedAt: new Date().toISOString(),
  };
  const current = readDynamicCaptures();
  current.unshift(capture);
  localStorage.setItem(CAPTURES_KEY, JSON.stringify(current));
  const points = Number(localStorage.getItem("hrr-demo-points-v1") ?? "0") + pointsToAward;
  localStorage.setItem("hrr-demo-points-v1", String(points));
  window.dispatchEvent(new CustomEvent("hrr-points-updated", { detail: { total: points } }));
  window.dispatchEvent(new CustomEvent("hrr-dynamic-captures-updated"));
  return capture;
}

export function readDynamicCaptures(): DynamicCapture[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CAPTURES_KEY) ?? "[]") as DynamicCapture[]; }
  catch { return []; }
}
