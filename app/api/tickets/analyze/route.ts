import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Extraction = {
  merchantName: string;
  branch: string;
  ticketNumber: string;
  purchaseDate: string;
  total: number;
  currency: string;
  products: { name: string; quantity: number; amount: number }[];
  confidence: number;
  legible: boolean;
};

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey || !authorization) {
      return NextResponse.json({ status: "rejected", message: "Sesión no válida." }, { status: 401 });
    }

    const db = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ status: "rejected", message: "Inicia sesión nuevamente." }, { status: 401 });

    const form = await request.formData();
    const images = form.getAll("images").filter((value): value is File => value instanceof File).slice(0, 3);
    const campaignId = String(form.get("campaignId") ?? "");
    const userLocation = JSON.parse(String(form.get("location") ?? "{}")) as { lat: number; lng: number; accuracy: number };
    if (!images.length || !campaignId) return NextResponse.json({ status: "rejected", message: "Faltan imágenes o campaña." }, { status: 400 });

    const [{ data: campaign, error: campaignError }, { data: rule, error: ruleError }, { data: locations, error: locationError }] = await Promise.all([
      db.from("campaigns").select("id,name,sponsor,status,starts_at,ends_at,metadata").eq("id", campaignId).eq("type", "brand").single(),
      db.from("brand_rules").select("*").eq("campaign_id", campaignId).single(),
      db.from("campaign_locations").select("*").eq("campaign_id", campaignId).eq("is_active", true),
    ]);
    if (campaignError || ruleError || locationError || !campaign || !rule || !locations?.length) {
      return NextResponse.json({ status: "rejected", message: "La campaña no está disponible." }, { status: 404 });
    }
    const now = new Date();
    if (campaign.status !== "active" || (campaign.starts_at && now < new Date(campaign.starts_at)) || (campaign.ends_at && now > new Date(campaign.ends_at))) {
      return NextResponse.json({ status: "rejected", message: "La campaña no está activa." }, { status: 400 });
    }

    const brandName = String(rule.expected_brand);
    const requiredProducts = Array.isArray(rule.required_products) ? rule.required_products.map(String) : [];
    const minimumTotal = Number(rule.minimum_total ?? 0);
    const minimumConfidence = Number(rule.confidence_threshold ?? 0.8);
    let extraction: Extraction;

    if (!process.env.OPENAI_API_KEY) {
      extraction = {
        merchantName: brandName,
        branch: String(locations[0].name ?? "Sucursal demo"),
        ticketNumber: `DEMO-${Date.now().toString().slice(-6)}`,
        purchaseDate: new Date().toISOString().slice(0, 10),
        total: Math.max(minimumTotal, 199),
        currency: "MXN",
        products: requiredProducts.map((name: string) => ({ name, quantity: 1, amount: 99 })),
        confidence: 0.92,
        legible: true,
      };
    } else {
      const content: Array<Record<string, unknown>> = [{
        type: "input_text",
        text: `Analiza este ticket mexicano. Extrae únicamente datos visibles. Marca esperada: ${brandName}. Productos esperados: ${requiredProducts.join(", ")}.`,
      }];
      for (const image of images) content.push({ type: "input_image", image_url: await fileToDataUrl(image), detail: "high" });
      const apiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
          store: false,
          input: [{ role: "user", content }],
          text: { format: { type: "json_schema", name: "ticket_extraction", strict: true, schema: {
            type: "object", additionalProperties: false,
            properties: {
              merchantName: { type: "string" }, branch: { type: "string" }, ticketNumber: { type: "string" }, purchaseDate: { type: "string" },
              total: { type: "number" }, currency: { type: "string" }, confidence: { type: "number" }, legible: { type: "boolean" },
              products: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, quantity: { type: "number" }, amount: { type: "number" } }, required: ["name","quantity","amount"] } },
            },
            required: ["merchantName","branch","ticketNumber","purchaseDate","total","currency","products","confidence","legible"],
          } } },
        }),
      });
      if (!apiResponse.ok) throw new Error(`OpenAI API ${apiResponse.status}: ${await apiResponse.text()}`);
      const data = (await apiResponse.json()) as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
      const outputText = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
      if (!outputText) throw new Error("OpenAI no devolvió una extracción estructurada.");
      extraction = JSON.parse(outputText) as Extraction;
    }

    const normalizedBrand = brandName.toLowerCase();
    const detectedBrand = extraction.merchantName.toLowerCase();
    const brandOk = detectedBrand.includes(normalizedBrand) || normalizedBrand.includes(detectedBrand);
    const totalOk = extraction.total >= minimumTotal;
    const productText = extraction.products.map((product) => product.name.toLowerCase()).join(" ");
    const productsOk = requiredProducts.length === 0 || requiredProducts.some((product: string) => productText.includes(product.toLowerCase()));
    const toRad = (value: number) => (value * Math.PI) / 180;
    const distanceTo = (location: { latitude: number; longitude: number }) => {
      const dLat = toRad(Number(location.latitude) - userLocation.lat);
      const dLng = toRad(Number(location.longitude) - userLocation.lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userLocation.lat)) * Math.cos(toRad(Number(location.latitude))) * Math.sin(dLng / 2) ** 2;
      return 2 * 6371000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    };
    const closest = [...locations].sort((a, b) => distanceTo(a) - distanceTo(b))[0];
    const locationOk = distanceTo(closest) <= Number(closest.radius_meters) + Math.min(userLocation.accuracy || 0, 100);

    if (!extraction.legible || extraction.confidence < minimumConfidence) {
      return NextResponse.json({ status: "review", message: "El ticket necesita revisión manual por legibilidad o confianza.", extraction });
    }
    if (!brandOk || !totalOk || !productsOk || !locationOk) {
      return NextResponse.json({
        status: "rejected",
        message: !brandOk ? "La marca no coincide." : !totalOk ? "El total no alcanza el mínimo." : !productsOk ? "No se detectó un producto participante." : "La ubicación está fuera del radio permitido.",
        extraction,
      });
    }
    const reward = String((campaign.metadata as { reward?: string } | null)?.reward ?? campaign.name);
    return NextResponse.json({ status: "approved", message: `Validación correcta. Ganaste ${reward}.`, extraction });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: "review", message: "No fue posible completar el análisis automático; se envió a revisión." });
  }
}
