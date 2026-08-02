"use client";

import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Gift,
  MapPin,
  ReceiptText,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "../../CazarRecompensas.module.css";
import { persistTicketSubmission } from "@/lib/tickets";
import { supabase } from "@/lib/supabase";
import {
  awardDynamicReward,
  distanceMeters,
  readActiveDynamicCampaigns,
  type BrandCampaign,
} from "@/lib/campaignDynamics";
import {
  DEFAULT_DEMO_CONFIG,
  DEMO_CONFIG_EVENT,
  readDemoConfig,
  type DemoConfig,
} from "@/lib/demoConfig";

interface Analysis {
  status: "approved" | "review" | "rejected";
  message: string;
  extraction?: {
    merchantName?: string;
    ticketNumber?: string;
    purchaseDate?: string;
    total?: number;
    confidence?: number;
  };
}

export default function BrandTicketPage() {
  const campaignId = useSearchParams().get("campaign") ?? "";

  const [campaign, setCampaign] = useState<BrandCampaign | null>(null);

  useEffect(() => {
    let active = true;
    void readActiveDynamicCampaigns("brand").then((items) => {
      if (active) setCampaign((items as BrandCampaign[]).find((item) => item.id === campaignId) ?? null);
    });
    return () => { active = false; };
  }, [campaignId]);

  const [files, setFiles] = useState<File[]>([]);
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [demoConfig, setDemoConfig] = useState<DemoConfig>(
    DEFAULT_DEMO_CONFIG
  );

  useEffect(() => {
    let active = true;
    async function update() { try { const value = await readDemoConfig(); if (active) setDemoConfig(value); } catch {} }
    void update();
    const refresh = () => { void update(); };
    window.addEventListener(DEMO_CONFIG_EVENT, refresh);
    return () => { active = false; window.removeEventListener(DEMO_CONFIG_EVENT, refresh); };
  }, []);

  if (!campaign) {
    return (
      <main className={`${styles.mobileStage} ${styles.ticketStage}`}>
        <section className={styles.emptyCard}>
          <XCircle />
          <h2>Campaña no disponible</h2>
        </section>
      </main>
    );
  }

  const activeCampaign: BrandCampaign = campaign;

  async function validateLocation() {
    const demo = await readDemoConfig();

    if (demo.simulatedLocationEnabled) {
      setCoords({
        lat: demo.simulatedLatitude,
        lng: demo.simulatedLongitude,
        accuracy: 5,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      () => setCoords(null),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000,
      }
    );
  }

  async function analyze() {
    if (!files.length || !coords) return;

    setWorking(true);
    setResult(null);

    const form = new FormData();
    files.forEach((file) => form.append("images", file));
    form.append("campaignId", activeCampaign.id);
    form.append("location", JSON.stringify(coords));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/tickets/analyze", {
        method: "POST",
        headers: sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : undefined,
        body: form,
      });

      const data = (await response.json()) as Analysis;
      await persistTicketSubmission({ campaign: activeCampaign, files, coords, analysis: data });
      setResult(data);

      if (data.status === "approved") {
        await awardDynamicReward(activeCampaign);
      }
    } catch {
      setResult({
        status: "review",
        message:
          "No pudimos terminar el análisis. El ticket quedó para revisión.",
      });
    } finally {
      setWorking(false);
    }
  }

  function simulatePrizeWon() {
    const location = activeCampaign.locations[0];

    if (location) {
      setCoords({
        lat: location.latitude,
        lng: location.longitude,
        accuracy: 5,
      });
    }

    setResult({
      status: "approved",
      message:
        "La compra, la marca y la ubicación fueron validadas correctamente.",
      extraction: {
        merchantName: activeCampaign.brandName,
        ticketNumber: `DEMO-${Date.now().toString().slice(-6)}`,
        purchaseDate: new Date().toISOString().slice(0, 10),
        total: Math.max(activeCampaign.minimumTotal, 199),
        confidence: 0.98,
      },
    });

    void awardDynamicReward(activeCampaign);
  }

  function simulateInvalidTicket() {
    setResult({
      status: "rejected",
      message:
        "El ticket no cumple con la marca, vigencia o productos requeridos para esta campaña.",
      extraction: {
        merchantName: "Marca no válida",
        ticketNumber: `DEMO-${Date.now().toString().slice(-6)}`,
        purchaseDate: new Date().toISOString().slice(0, 10),
        total: 49,
        confidence: 0.91,
      },
    });
  }

  const distance = coords
    ? Math.round(
        Math.min(
          ...activeCampaign.locations.map((location) =>
            distanceMeters(
              coords.lat,
              coords.lng,
              location.latitude,
              location.longitude
            )
          )
        )
      )
    : null;

  return (
    <main className={`${styles.mobileStage} ${styles.ticketStage}`}>
      <div className={styles.topBar}>
        <Link
          href="/usuario/cazar-recompensas/marca"
          className={styles.backButton}
          aria-label="Regresar"
        >
          <ArrowLeft />
        </Link>

        <span>{activeCampaign.brandName}</span>
      </div>

      <section className={styles.ticketPanel}>
        <div className={styles.eyebrow}>
          <ReceiptText />
          Validación con IA
        </div>

        <h1>{activeCampaign.name}</h1>

        <p>
          Sube hasta 3 fotos claras del ticket. Extraeremos folio, marca,
          fecha, total y productos.
        </p>

        <label className={styles.ticketUpload}>
          <Upload />
          <strong>Seleccionar fotos</strong>
          <span>{files.length}/3 imágenes</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(event) =>
              setFiles(Array.from(event.target.files ?? []).slice(0, 3))
            }
          />
        </label>

        <button
          type="button"
          className={styles.locationButton}
          onClick={() => { void validateLocation(); }}
        >
          <MapPin />
          {coords ? `Ubicación lista · ${distance} m` : "Validar ubicación"}
        </button>

        <button
          type="button"
          className={`${styles.cameraButton} ${styles.ticketSubmitButton}`}
          onClick={analyze}
          disabled={!files.length || !coords || working}
        >
          <Camera />
          {working ? "Analizando ticket..." : "Enviar a validación"}
        </button>

        {demoConfig.simulatedLocationEnabled && (
          <section className={styles.brandDemoActions}>
            <span>Controles de demostración</span>

            <div>
              <button type="button" onClick={simulatePrizeWon}>
                <Gift />
                Simular premio ganado
              </button>

              <button type="button" onClick={simulateInvalidTicket}>
                <XCircle />
                Simular ticket no válido
              </button>
            </div>
          </section>
        )}

        {result && (
          <div
            className={`${styles.ticketResult} ${
              styles[`ticket_${result.status}`]
            }`}
          >
            {result.status === "approved" ? (
              <Gift />
            ) : result.status === "rejected" ? (
              <XCircle />
            ) : (
              <ReceiptText />
            )}

            <h2>
              {result.status === "approved"
                ? "Premio ganado"
                : result.status === "review"
                  ? "En revisión"
                  : "Ticket rechazado"}
            </h2>

            <p>{result.message}</p>

            {result.extraction && (
              <div>
                <span>{result.extraction.merchantName}</span>
                <strong>
                  Folio {result.extraction.ticketNumber || "no detectado"}
                </strong>
                <small>
                  Total ${result.extraction.total ?? 0} · Confianza{" "}
                  {Math.round((result.extraction.confidence ?? 0) * 100)}%
                </small>
              </div>
            )}

            {result.status === "approved" && (
              <Link href="/usuario/cazar-recompensas/capturas">
                Ver mi recompensa
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
