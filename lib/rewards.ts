import { supabase } from "@/lib/supabase";

export interface RewardDashboardItem {
  id: string;
  campaignId: string;
  campaignName: string;
  campaignType: "qr" | "map" | "brand";
  rewardName: string;
  rewardCode: string;
  points: number;
  claimedAt: string;
}

export interface RewardDashboard {
  points: number;
  captures: number;
  prizes: number;
  items: RewardDashboardItem[];
}

export async function readMyRewardsDashboard(): Promise<RewardDashboard> {
  const { data, error } = await supabase.rpc("get_my_rewards_dashboard");
  if (error) throw error;

  const payload = (data ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  return {
    points: Number(payload.points ?? 0),
    captures: Number(payload.captures ?? 0),
    prizes: Number(payload.prizes ?? 0),
    items: rawItems.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        campaignId: String(row.campaignId ?? ""),
        campaignName: String(row.campaignName ?? "Campaña"),
        campaignType: String(row.campaignType ?? "qr") as RewardDashboardItem["campaignType"],
        rewardName: String(row.rewardName ?? "Premio"),
        rewardCode: String(row.rewardCode ?? ""),
        points: Number(row.points ?? 0),
        claimedAt: String(row.claimedAt ?? new Date().toISOString()),
      };
    }),
  };
}
