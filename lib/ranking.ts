import { supabase } from "@/lib/supabase";

export interface RankingPlayer {
  id: string;
  name: string;
  state: string;
  points: number;
  level: string;
  photo: string;
}

export async function readRanking(limit = 100): Promise<RankingPlayer[]> {
  const { data, error } = await supabase.from("ranking_view").select("*").limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.full_name ?? "Usuario"),
    state: String(row.state ?? "México"),
    points: Number(row.total_points ?? 0),
    level: String(row.level ?? "Novato"),
    photo: String(row.avatar_url ?? ""),
  }));
}
