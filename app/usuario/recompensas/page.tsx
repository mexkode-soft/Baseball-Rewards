"use client";

import { ArrowLeft, Gift, QrCode, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../cazar-recompensas/CazarRecompensas.module.css";
import { readMyRewardsDashboard, type RewardDashboard } from "@/lib/rewards";

const EMPTY_DASHBOARD: RewardDashboard = { points: 0, captures: 0, prizes: 0, items: [] };

function formatCaptureDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function RecompensasPage() {
  const [dashboard, setDashboard] = useState<RewardDashboard>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const update = async () => {
      try {
        const current = await readMyRewardsDashboard();
        if (!active) return;
        setDashboard(current);
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar tus recompensas.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void update();
    window.addEventListener("hrr-qr-captures-updated", update);
    window.addEventListener("hrr-points-updated", update);
    window.addEventListener("hrr-dynamic-captures-updated", update);

    return () => {
      active = false;
      window.removeEventListener("hrr-qr-captures-updated", update);
      window.removeEventListener("hrr-points-updated", update);
      window.removeEventListener("hrr-dynamic-captures-updated", update);
    };
  }, []);

  return (
    <main className={`${styles.mobileStage} ${styles.capturesStage}`}>
      <div className={styles.topBar}>
        <Link href="/usuario" className={styles.backButton} aria-label="Regresar"><ArrowLeft /></Link>
        <span>Mis recompensas</span>
      </div>

      <section className={styles.capturesSummary} aria-busy={loading}>
        <div><Trophy /><span>Puntos</span><strong>{dashboard.points}</strong></div>
        <div><Gift /><span>Premios</span><strong>{dashboard.prizes}</strong></div>
        <div><QrCode /><span>Capturas</span><strong>{dashboard.captures}</strong></div>
      </section>

      {errorMessage ? (
        <section className={styles.emptyCard}><Sparkles /><h2>No pudimos cargar tus recompensas</h2><p>{errorMessage}</p></section>
      ) : !loading && dashboard.items.length === 0 ? (
        <section className={styles.emptyCard}>
          <Sparkles />
          <h2>Todavía no tienes recompensas</h2>
          <p>Participa en una dinámica para comenzar tu colección.</p>
          <Link href="/usuario/cazar-recompensas">Buscar campaña</Link>
        </section>
      ) : (
        <section className={styles.captureList}>
          {dashboard.items.map((item) => (
            <article key={item.id} className={`${styles.captureCard} ${styles.captureWinner}`}>
              <div className={styles.captureIcon}><Gift /></div>
              <div className={styles.captureContent}>
                <span>{item.campaignName}</span>
                <strong>{item.rewardName}</strong>
                <small>{item.rewardCode ? `${item.rewardCode} · ` : ""}{formatCaptureDate(item.claimedAt)}</small>
              </div>
              <div className={styles.capturePoints}>+{item.points}</div>
            </article>
          ))}
        </section>
      )}

      <div className={styles.captureActions}>
        <Link href="/usuario/cazar-recompensas" className={styles.capturePrimary}>Explorar dinámicas</Link>
      </div>
    </main>
  );
}
