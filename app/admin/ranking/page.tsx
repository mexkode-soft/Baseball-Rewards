"use client";

import { Crown, Medal, Shield, Star, Trophy, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readRanking, type RankingPlayer } from "@/lib/ranking";
import styles from "./Ranking.module.css";

function formatPoints(points: number) { return new Intl.NumberFormat("es-MX").format(points); }
function levelClass(level: string) {
  if (level === "Leyenda") return styles.legendLevel;
  if (level === "All Star") return styles.allStarLevel;
  return styles.rookieLevel;
}
function LevelIcon({ level }: { level: string }) {
  if (level === "Leyenda") return <Crown />;
  if (level === "All Star") return <Star />;
  return <Shield />;
}
function Avatar({ player }: { player: RankingPlayer }) {
  return player.photo ? <img src={player.photo} alt={`Foto de ${player.name}`} referrerPolicy="no-referrer" /> : <UserRound />;
}

export default function RankingPage() {
  const [players, setPlayers] = useState<RankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void readRanking(100)
      .then(setPlayers)
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo cargar el ranking."))
      .finally(() => setLoading(false));
  }, []);

  const podium = useMemo(() => players.slice(0, 3), [players]);

  return (
    <>
      <div className={styles.pageTitle}>
        <span>Clasificación general</span>
        <h1>Ranking</h1>
        <p>Resultados reales calculados con los puntos guardados en Supabase.</p>
      </div>

      {loading && <p>Cargando ranking...</p>}
      {message && <p>{message}</p>}

      {podium.length > 0 && (
        <section className={styles.podiumSection}>
          <div className={styles.podiumHeading}>
            <div><span>Líderes de la temporada</span><h2>El podio de los campeones</h2></div>
            <div className={styles.seasonBadge}><Trophy />Temporada 2026</div>
          </div>
          <div className={styles.podium}>
            {podium.map((player, index) => (
              <article key={player.id} className={`${styles.podiumPlayer} ${index === 0 ? styles.firstPlace : index === 1 ? styles.secondPlace : styles.thirdPlace}`}>
                {index === 0 && <div className={styles.championCrown}><Crown /></div>}
                <div className={styles.medal}><Medal /><span>{index + 1}</span></div>
                <div className={styles.podiumPhoto}><Avatar player={player} /></div>
                <div className={styles.playerInformation}><strong>{player.name}</strong><span>{player.state}</span><b>{formatPoints(player.points)} pts</b></div>
                <div className={styles.podiumBase}><span>{index === 0 ? "Oro" : index === 1 ? "Plata" : "Bronce"}</span><strong>{index + 1}</strong></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className={styles.rankingSection}>
        <div className={styles.rankingHeading}><div><span>Tabla general</span><h2>Todos los participantes</h2></div><div className={styles.playersBadge}>{players.length} jugadores</div></div>
        <div className={styles.rankingList}>
          {players.map((player, index) => (
            <article key={player.id} className={styles.rankingRow}>
              <div className={styles.position}>{index + 1}</div>
              <div className={styles.playerPhoto}><Avatar player={player} /></div>
              <div className={styles.playerData}><strong>{player.name}</strong><span>{player.state}</span></div>
              <div className={`${styles.levelBadge} ${levelClass(player.level)}`}><LevelIcon level={player.level} />{player.level}</div>
              <div className={styles.points}>{formatPoints(player.points)} <span>pts</span></div>
            </article>
          ))}
          {!loading && players.length === 0 && <div className={styles.emptyState}><Trophy /><strong>Aún no hay participantes con puntos.</strong></div>}
        </div>
      </section>
    </>
  );
}
