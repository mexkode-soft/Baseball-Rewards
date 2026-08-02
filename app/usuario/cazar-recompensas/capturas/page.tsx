"use client";

import {
  ArrowLeft,
  Gift,
  QrCode,
  Sparkles,
  Trophy,
} from "lucide-react";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "../CazarRecompensas.module.css";

import {
  readDemoPoints,
  readQrCaptures,
  type QrCapture,
} from "@/lib/qrCampaigns";
import { readDynamicCaptures, type DynamicCapture } from "@/lib/campaignDynamics";

function formatCaptureDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CapturasPage() {
  const [captures, setCaptures] = useState<QrCapture[]>([]);
  const [points, setPoints] = useState(0);
  const [dynamicCaptures, setDynamicCaptures] = useState<DynamicCapture[]>([]);

  useEffect(() => {
    const update = () => {
      setCaptures(readQrCaptures());
      setPoints(readDemoPoints());
      setDynamicCaptures(readDynamicCaptures());
    };

    update();
    window.addEventListener("hrr-qr-captures-updated", update);
    window.addEventListener("hrr-points-updated", update);
    window.addEventListener("hrr-dynamic-captures-updated", update);

    return () => {
      window.removeEventListener("hrr-qr-captures-updated", update);
      window.removeEventListener("hrr-points-updated", update);
      window.removeEventListener("hrr-dynamic-captures-updated", update);
    };
  }, []);

  const winners = useMemo(
    () => captures.filter((capture) => capture.isWinner),
    [captures]
  );

  const latestActivity = useMemo(() => {
    const qrItems = captures.map((capture) => ({
      type: "qr" as const,
      capturedAt: capture.capturedAt,
    }));

    const dynamicItems = dynamicCaptures.map((capture) => ({
      type: capture.type,
      capturedAt: capture.capturedAt,
    }));

    return [...qrItems, ...dynamicItems].sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() -
        new Date(a.capturedAt).getTime()
    )[0];
  }, [captures, dynamicCaptures]);

  const nextRoute =
    latestActivity?.type === "map"
      ? "/usuario/cazar-recompensas/mapa"
      : latestActivity?.type === "brand"
        ? "/usuario/cazar-recompensas/marca"
        : "/usuario/cazar-recompensas/qr";

  const nextLabel =
    latestActivity?.type === "map"
      ? "Buscar otro premio en mapa"
      : latestActivity?.type === "brand"
        ? "Participar con otra marca"
        : "Buscar otro QR";

  return (
    <main className={`${styles.mobileStage} ${styles.capturesStage}`}>
      <div className={styles.topBar}>
        <Link
          href="/usuario/cazar-recompensas"
          className={styles.backButton}
          aria-label="Regresar"
        >
          <ArrowLeft />
        </Link>

        <span>Mis recompensas</span>
      </div>

      <section className={styles.capturesSummary}>
        <div><Trophy /><span>Puntos</span><strong>{points}</strong></div>
        <div><Gift /><span>Premios</span><strong>{winners.length + dynamicCaptures.length}</strong></div>
        <div><QrCode /><span>Capturas</span><strong>{captures.length + dynamicCaptures.length}</strong></div>
      </section>

      {captures.length === 0 && dynamicCaptures.length === 0 ? (
        <section className={styles.emptyCard}>
          <Sparkles />
          <h2>Todavía no tienes capturas</h2>
          <p>Encuentra un QR para comenzar tu colección.</p>
          <Link href="/usuario/cazar-recompensas/qr">Buscar campaña</Link>
        </section>
      ) : (
        <section className={styles.captureList}>
          {dynamicCaptures.map((capture) => (
            <article key={capture.id} className={`${styles.captureCard} ${styles.captureWinner}`}>
              <div className={styles.captureIcon}><Gift /></div>
              <div className={styles.captureContent}><span>{capture.campaignName}</span><strong>{capture.reward}</strong><small>{capture.rewardCode} · {formatCaptureDate(capture.capturedAt)}</small></div>
              <div className={styles.capturePoints}>+{capture.points}</div>
            </article>
          ))}
          {captures.map((capture) => (
            <article
              key={capture.id}
              className={`${styles.captureCard} ${
                capture.isWinner ? styles.captureWinner : ""
              }`}
            >
              <div className={styles.captureIcon}>
                {capture.isWinner ? <Gift /> : <QrCode />}
              </div>

              <div className={styles.captureContent}>
                <span>{capture.campaignName}</span>
                <strong>{capture.isWinner ? capture.reward : "QR capturado"}</strong>
                <small>{capture.codeLabel} · {formatCaptureDate(capture.capturedAt)}</small>
              </div>

              <div className={styles.capturePoints}>+{capture.points}</div>
            </article>
          ))}
        </section>
      )}

      <div className={styles.captureActions}>
        <Link href={nextRoute} className={styles.capturePrimary}>
          {nextLabel}
        </Link>
        <Link href="/usuario/cazar-recompensas" className={styles.captureSecondary}>
          Volver a dinámicas
        </Link>
      </div>
    </main>
  );
}
