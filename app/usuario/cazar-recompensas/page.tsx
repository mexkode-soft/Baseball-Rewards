"use client";

import {
  ChevronRight,
  MapPin,
  QrCode,
  ReceiptText,
  Sparkles,
} from "lucide-react";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import styles from "./CazarRecompensas.module.css";

import { readActiveQrCampaigns } from "@/lib/qrCampaigns";
import { readActiveDynamicCampaigns, DYNAMIC_CAMPAIGNS_EVENT } from "@/lib/campaignDynamics";

export default function CazarRecompensasPage() {
  const [activeQrCount,setActiveQrCount]=useState(0);
  const [activeMapCount,setActiveMapCount]=useState(0);
  const [activeBrandCount,setActiveBrandCount]=useState(0);

  useEffect(() => {
    const update = () => {
      setActiveQrCount(readActiveQrCampaigns().length);
      setActiveMapCount(readActiveDynamicCampaigns("map").length);
      setActiveBrandCount(readActiveDynamicCampaigns("brand").length);
    };

    update();

    window.addEventListener("hrr-qr-campaigns-updated",update);
    window.addEventListener(DYNAMIC_CAMPAIGNS_EVENT,update);

    return () => {
      window.removeEventListener("hrr-qr-campaigns-updated",update);
      window.removeEventListener(DYNAMIC_CAMPAIGNS_EVENT,update);
    };
  }, []);

  return (
    <main
      className={
        styles.mobileStage
      }
    >
      <section
        className={
          styles.heroIntro
        }
      >
        <div
          className={
            styles.eyebrow
          }
        >
          <Sparkles />

          Elige tu reto
        </div>

        <h1>
          ¿Qué quieres jugar hoy?
        </h1>

        <p>
          Selecciona una dinámica
          y empieza a sumar
          recompensas.
        </p>
      </section>

      <section
        className={
          styles.dynamicsGrid
        }
      >
        <Link
        href="/usuario/cazar-recompensas/qr"
        className={`${styles.dynamicCard} ${styles.dynamicQr}`}
        >
          <div
            className={
              styles.dynamicIcon
            }
          >
            <QrCode />
          </div>

          <div>
            <span>
              Búsqueda QR
            </span>

            <strong>
              Encuentra códigos
              escondidos
            </strong>

            <small>
              {activeQrCount > 0
                ? `${activeQrCount} campaña${activeQrCount === 1 ? "" : "s"} activa${activeQrCount === 1 ? "" : "s"}`
                : "Sin campañas activas"}
            </small>
          </div>

          <ChevronRight />
        </Link>

        <Link href="/usuario/cazar-recompensas/mapa" className={`${styles.dynamicCard} ${styles.dynamicMap}`}>
          <div
            className={
              styles.dynamicIcon
            }
          >
            <MapPin />
          </div>

          <div>
            <span>
              Recompensa en mapa
            </span>

            <strong>
              Acércate, responde
              y gana
            </strong>

            <small>
              {activeMapCount ? `${activeMapCount} campaña${activeMapCount===1?"":"s"} activa${activeMapCount===1?"":"s"}` : "Sin campañas activas"}
            </small>
          </div>

          <ChevronRight />
        </Link>

        <Link href="/usuario/cazar-recompensas/marca" className={`${styles.dynamicCard} ${styles.dynamicBrand}`}>
          <div
            className={
              styles.dynamicIcon
            }
          >
            <ReceiptText />
          </div>

          <div>
            <span>
              Visita a marca
            </span>

            <strong>
              Sube tu ticket y
              obtén puntos
            </strong>

            <small>
              {activeBrandCount ? `${activeBrandCount} campaña${activeBrandCount===1?"":"s"} activa${activeBrandCount===1?"":"s"}` : "Sin campañas activas"}
            </small>
          </div>

          <ChevronRight />
        </Link>
      </section>
    </main>
  );
}
