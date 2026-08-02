import { supabase } from "@/lib/supabase";

export interface Level {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  active: boolean;
  order: number;
  description?: string;
}

export const LEVELS_UPDATED_EVENT = "hrr-levels-updated";

export const DEFAULT_LEVELS: Level[] = [
  { id: "level-novato", name: "Novato", minPoints: 0, maxPoints: 999, active: true, order: 1 },
  { id: "level-all-star", name: "All Star", minPoints: 1000, maxPoints: 4999, active: true, order: 2 },
  { id: "level-leyenda", name: "Leyenda", minPoints: 5000, maxPoints: null, active: true, order: 3 },
];

function mapRow(row: Record<string, unknown>): Level {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    minPoints: Number(row.minimum_points ?? 0),
    maxPoints: row.maximum_points === null || row.maximum_points === undefined ? null : Number(row.maximum_points),
    active: row.is_active !== false,
    order: Number(row.sort_order ?? 0),
    description: row.description ? String(row.description) : undefined,
  };
}

export async function readLevels(includeInactive = true): Promise<Level[]> {
  let query = supabase.from("levels").select("*").order("sort_order", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function saveLevels(levels: Level[]): Promise<void> {
  const { data: existing, error: existingError } = await supabase.from("levels").select("id");
  if (existingError) throw existingError;
  const retainedIds = levels.filter((level) => /^[0-9a-f-]{36}$/i.test(level.id)).map((level) => level.id);
  const removedIds = (existing ?? []).map((row) => String(row.id)).filter((id) => !retainedIds.includes(id));
  if (removedIds.length) {
    const { error: deleteError } = await supabase.from("levels").delete().in("id", removedIds);
    if (deleteError) throw deleteError;
  }
  const rows = levels.map((level, index) => ({
    id: level.id.startsWith("level-") ? undefined : level.id,
    name: level.name,
    description: level.description ?? null,
    minimum_points: Math.max(0, level.minPoints),
    maximum_points: level.maxPoints,
    is_active: level.active,
    sort_order: index + 1,
  }));
  for (const row of rows) {
    const payload = { ...row };
    if (!payload.id) delete payload.id;
    const { error } = row.id
      ? await supabase.from("levels").upsert(payload)
      : await supabase.from("levels").upsert(payload, { onConflict: "name" });
    if (error) throw error;
  }
  window.dispatchEvent(new CustomEvent(LEVELS_UPDATED_EVENT));
}

export function getLevelByPoints(points: number, levels: Level[]): Level | null {
  return [...levels]
    .filter((level) => level.active)
    .sort((a, b) => a.minPoints - b.minPoints)
    .find((level) => points >= level.minPoints && (level.maxPoints === null || points <= level.maxPoints)) ?? null;
}

export function getNextLevel(points: number, levels: Level[]): Level | null {
  return [...levels]
    .filter((level) => level.active && level.minPoints > points)
    .sort((a, b) => a.minPoints - b.minPoints)[0] ?? null;
}

export function getLevelProgress(points: number, level: Level): number {
  if (level.maxPoints === null) return 100;
  const range = Math.max(1, level.maxPoints - level.minPoints + 1);
  return Math.min(100, Math.max(0, Math.round(((points - level.minPoints + 1) / range) * 100)));
}
