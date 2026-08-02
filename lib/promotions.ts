import { supabase } from "@/lib/supabase";

export type PromotionStatus = "Activa" | "Borrador";
export interface Promotion {
  id: string;
  brandName: string;
  brandImage: string;
  title: string;
  description: string;
  code: string;
  expiration: string;
  productImages: string[];
  status: PromotionStatus;
}

function mapRow(row: Record<string, unknown>): Promotion {
  const metadata = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    brandName: String(row.brand ?? "Home Run Rewards"),
    brandImage: String(metadata.brandImage ?? row.image_url ?? "/images/logo-home-run.png"),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    code: String(row.code ?? ""),
    expiration: row.ends_at ? new Date(String(row.ends_at)).toISOString().slice(0, 10) : "",
    productImages: Array.isArray(metadata.productImages) ? metadata.productImages.map(String) : [],
    status: row.is_active ? "Activa" : "Borrador",
  };
}

export async function readPromotions(includeInactive = false): Promise<Promotion[]> {
  let query = supabase.from("promotions").select("*").order("created_at", { ascending: false });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function uploadPromotionImage(file: File, folder: string): Promise<string> {
  const safeName = file.name.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("promotion-images").upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw error;
  return supabase.storage.from("promotion-images").getPublicUrl(path).data.publicUrl;
}

export async function createPromotion(promotion: Omit<Promotion, "id">): Promise<Promotion> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("promotions").insert({
    title: promotion.title,
    description: promotion.description || null,
    brand: promotion.brandName,
    code: promotion.code || null,
    image_url: promotion.brandImage || null,
    starts_at: new Date().toISOString(),
    ends_at: promotion.expiration ? `${promotion.expiration}T23:59:59` : null,
    is_active: promotion.status === "Activa",
    created_by: userData.user?.id ?? null,
    metadata: { brandImage: promotion.brandImage, productImages: promotion.productImages },
  }).select("*").single();
  if (error) throw error;
  return mapRow(data as Record<string, unknown>);
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw error;
}
