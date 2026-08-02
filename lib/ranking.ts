import { supabase } from "@/lib/supabase";
import { readActiveSeason, type Season } from "@/lib/seasons";

export interface RankingPlayer {
  id: string;
  name: string;
  state: string;
  points: number;
  level: string;
  photo: string;
}

export interface RankingResult {
  season: Season | null;
  players: RankingPlayer[];
}

export async function readRanking(limit = 100, seasonId?: string): Promise<RankingPlayer[]> {
  const active = seasonId ? null : await readActiveSeason();
  const selectedId = seasonId ?? active?.id;
  if (!selectedId) return [];
  const { data, error } = await supabase
    .from("season_ranking_view")
    .select("*")
    .eq("season_id", selectedId)
    .order("season_points", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.full_name ?? "Usuario"),
    state: String(row.state ?? "México"),
    points: Number(row.season_points ?? 0),
    level: String(row.level ?? "Novato"),
    photo: String(row.avatar_url ?? ""),
  }));
}
