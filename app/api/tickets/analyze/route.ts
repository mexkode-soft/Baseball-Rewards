import { NextResponse } from "next/server";
import type { BrandCampaign } from "@/lib/campaignDynamics";

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
    const form = await request.formData();
    const images = form.getAll("images").filter((value): value is File => value instanceof File).slice(0, 3);
    const campaign = JSON.parse(String(form.get("campaign") ?? "{}")) as BrandCampaign;
    const userLocation = JSON.parse(String(form.get("location") ?? "{}")) as { lat: number; lng: number; accuracy: number };

    if (!images.length) {
      return NextResponse.json({ status: "rejected", message: "No se recibieron imágenes." }, { status: 400 });
    }

    let extraction: Extraction;

    if (!process.env.OPENAI_API_KEY) {
      extraction = {
        merchantName: campaign.brandName,
        branch: campaign.locations[0]?.name ?? "Sucursal demo",
        ticketNumber: `DEMO-${Date.now().toString().slice(-6)}`,
        purchaseDate: new Date().toISOString().slice(0, 10),
        total: Math.max(campaign.minimumTotal, 199),
        currency: "MXN",
        products: campaign.requiredProducts.map((name) => ({ name, quantity: 1, amount: 99 })),
        confidence: 0.92,
        legible: true,
      };
    } else {
      const content: Array<Record<string, unknown>> = [
        {
          type: "input_text",
          text: `Analiza este ticket mexicano. Extrae solo datos visibles. Marca esperada: ${campaign.brandName}. Productos esperados: ${campaign.requiredProducts.join(", ")}.`,
        },
      ];

      for (const image of images) {
        content.push({ type: "input_image", image_url: await fileToDataUrl(image), detail: "high" });
      }

      const apiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
          store: false,
          input: [{ role: "user", content }],
          text: {
            format: {
              type: "json_schema",
              name: "ticket_extraction",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  merchantName: { type: "string" },
                  branch: { type: "string" },
                  ticketNumber: { type: "string" },
                  purchaseDate: { type: "string" },
                  total: { type: "number" },
                  currency: { type: "string" },
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        name: { type: "string" },
                        quantity: { type: "number" },
                        amount: { type: "number" },
                      },
                      required: ["name", "quantity", "amount"],
                    },
                  },
                  confidence: { type: "number" },
                  legible: { type: "boolean" },
                },
                required: ["merchantName", "branch", "ticketNumber", "purchaseDate", "total", "currency", "products", "confidence", "legible"],
              },
            },
          },
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`OpenAI API ${apiResponse.status}: ${await apiResponse.text()}`);
      }

      const data = (await apiResponse.json()) as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
      const outputText = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
      if (!outputText) throw new Error("OpenAI no devolvió una extracción estructurada.");
      extraction = JSON.parse(outputText) as Extraction;
    }

    const normalizedBrand = campaign.brandName.toLowerCase();
    const detectedBrand = extraction.merchantName.toLowerCase();
    const brandOk = detectedBrand.includes(normalizedBrand) || normalizedBrand.includes(detectedBrand);
    const totalOk = extraction.total >= campaign.minimumTotal;
    const productText = extraction.products.map((product) => product.name.toLowerCase()).join(" ");
    const productsOk = campaign.requiredProducts.length === 0 || campaign.requiredProducts.some((product) => productText.includes(product.toLowerCase()));

    const location = campaign.locations[0];
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(location.latitude - userLocation.lat);
    const dLng = toRad(location.longitude - userLocation.lng);
    const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userLocation.lat)) * Math.cos(toRad(location.latitude)) * Math.sin(dLng / 2) ** 2;
    const distance = 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    const locationOk = distance <= location.radius + Math.min(userLocation.accuracy || 0, 100);

    if (!extraction.legible || extraction.confidence < campaign.minimumConfidence) {
      return NextResponse.json({ status: "review", message: "El ticket necesita revisión manual por legibilidad o confianza.", extraction });
    }

    if (!brandOk || !totalOk || !productsOk || !locationOk) {
      return NextResponse.json({
        status: "rejected",
        message: !brandOk
          ? "La marca no coincide."
          : !totalOk
            ? "El total no alcanza el mínimo."
            : !productsOk
              ? "No se detectó un producto participante."
              : "La ubicación está fuera del radio permitido.",
        extraction,
      });
    }

    return NextResponse.json({ status: "approved", message: `Validación correcta. Ganaste ${campaign.reward}.`, extraction });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: "review", message: "No fue posible completar el análisis automático; se envió a revisión." });
  }
}
