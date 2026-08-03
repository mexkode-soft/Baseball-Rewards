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

import styles from "../cazar-recompensas/CazarRecompensas.module.css";

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

export default function RecompensasPage() {
  const [captures, setCaptures] = useState<QrCapture[]>([]);
  const [points, setPoints] = useState(0);
  const [dynamicCaptures, setDynamicCaptures] = useState<DynamicCapture[]>([]);

  useEffect(() => {
    const update = async () => {
      const [qr, currentPoints, dynamic] = await Promise.all([readQrCaptures(), readDemoPoints(), readDynamicCaptures()]);
      setCaptures(qr);
      setPoints(currentPoints);
      setDynamicCaptures(dynamic);
    };

    void update();
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


  return (
    <main className={`${styles.mobileStage} ${styles.capturesStage}`}>
      <div className={styles.topBar}>
        <Link
          href="/usuario"
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
          <h2>Todavía no tienes recompensas</h2>
          <p>Participa en una dinámica para comenzar tu colección.</p>
          <Link href="/usuario/cazar-recompensas">Buscar campaña</Link>
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
        <Link href="/usuario/cazar-recompensas" className={styles.capturePrimary}>
          Explorar dinámicas
        </Link>
      </div>
    </main>
  );
}
