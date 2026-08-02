"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Gift,
  QrCode,
  Sparkles,
} from "lucide-react";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import styles from "../CazarRecompensas.module.css";

import {
  readActiveQrCampaigns,
  type QrCampaign,
} from "@/lib/qrCampaigns";

function formatDate(
  value: string
) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "2-digit",
      month: "short",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

export default function QrCampaignSelectorPage() {
  const [
    campaigns,
    setCampaigns,
  ] =
    useState<QrCampaign[]>(
      []
    );

  useEffect(() => {
    const update = async () => {
      setCampaigns(await readActiveQrCampaigns());
    };

    void update();

    window.addEventListener(
      "hrr-qr-campaigns-updated",
      update
    );

    return () => {
      window.removeEventListener(
        "hrr-qr-campaigns-updated",
        update
      );
    };
  }, []);

  return (
    <main
      className={
        styles.mobileStage
      }
    >
      <div
        className={
          styles.topBar
        }
      >
        <Link
          href="/usuario/cazar-recompensas"
          className={
            styles.backButton
          }
          aria-label="Regresar"
        >
          <ArrowLeft />
        </Link>

        <span>
          Búsqueda QR
        </span>
      </div>

      <section
        className={
          styles.selectorIntro
        }
      >
        <div
          className={
            styles.eyebrow
          }
        >
          <QrCode />

          Campañas activas
        </div>

        <h1>
          Elige dónde quieres
          participar
        </h1>

        <p>
          Selecciona una campaña
          y comienza la búsqueda.
        </p>
      </section>

      {campaigns.length ===
      0 ? (
        <section
          className={
            styles.emptyCard
          }
        >
          <Sparkles />

          <h2>
            No hay campañas
            activas
          </h2>

          <p>
            Regresa más tarde para
            encontrar una nueva
            dinámica.
          </p>

          <Link href="/usuario/cazar-recompensas">
            Volver
          </Link>
        </section>
      ) : (
        <section
          className={
            styles.campaignCarousel
          }
        >
          {campaigns.map(
            (campaign) => (
              <Link
                key={
                  campaign.id
                }
                href={`/usuario/cazar-recompensas/qr/jugar?campaign=${encodeURIComponent(
                campaign.id
                )}`}
                className={styles.campaignCard}
              >
                <div
                  className={
                    styles.campaignIcon
                  }
                >
                  <QrCode />
                </div>

                <div
                  className={
                    styles.campaignBody
                  }
                >
                  <span>
                    {
                      campaign.sponsor
                    }
                  </span>

                  <h2>
                    {
                      campaign.name
                    }
                  </h2>

                  <p>
                    {
                      campaign.description
                    }
                  </p>

                  <div
                    className={
                      styles.campaignMeta
                    }
                  >
                    <div>
                      <Gift />

                      <span>
                        {
                          campaign.reward
                        }
                      </span>
                    </div>

                    <div>
                      <CalendarDays />

                      <span>
                        Hasta{" "}
                        {formatDate(
                          campaign.endDate
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <ChevronRight />
              </Link>
            )
          )}
        </section>
      )}
    </main>
  );
}
