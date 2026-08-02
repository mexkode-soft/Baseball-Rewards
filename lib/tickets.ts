import { supabase } from "@/lib/supabase";
import type { BrandCampaign } from "@/lib/campaignDynamics";

export interface TicketAnalysis {
  status: "approved" | "review" | "rejected";
  message: string;
  extraction?: {
    merchantName?: string;
    branch?: string;
    ticketNumber?: string;
    purchaseDate?: string;
    total?: number;
    currency?: string;
    products?: Array<{ name: string; quantity: number; amount: number }>;
    confidence?: number;
  };
}

export async function persistTicketSubmission(options: {
  campaign: BrandCampaign;
  files: File[];
  coords: { lat: number; lng: number; accuracy: number };
  analysis: TicketAnalysis;
}): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Inicia sesión para enviar el ticket.");
  const id = crypto.randomUUID();
  const extraction = options.analysis.extraction ?? {};
  const status = options.analysis.status === "approved" ? "approved" : options.analysis.status === "review" ? "manual_review" : "rejected";
  const { error: insertError } = await supabase.from("ticket_submissions").insert({
    id,
    campaign_id: options.campaign.id,
    user_id: userData.user.id,
    status,
    latitude: options.coords.lat,
    longitude: options.coords.lng,
    merchant_name: extraction.merchantName ?? null,
    branch_name: extraction.branch ?? null,
    ticket_number: extraction.ticketNumber ?? null,
    purchase_date: extraction.purchaseDate || null,
    purchase_total: extraction.total ?? null,
    currency: extraction.currency ?? "MXN",
    products: extraction.products ?? [],
    confidence: extraction.confidence ?? null,
    validation_reason: options.analysis.message,
    ai_response: options.analysis,
    reviewed_at: status === "approved" || status === "rejected" ? new Date().toISOString() : null,
  });
  if (insertError) {
    if (insertError.code === "23505") throw new Error("Este folio ya fue registrado en la campaña.");
    throw insertError;
  }

  for (const [index, file] of options.files.entries()) {
    const safeName = file.name.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
    const path = `${userData.user.id}/${id}/${index + 1}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("ticket-images").upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });
    if (uploadError) throw uploadError;
    const { error: imageError } = await supabase.from("ticket_images").insert({ submission_id: id, storage_path: path, sort_order: index + 1 });
    if (imageError) throw imageError;
  }
  return id;
}
