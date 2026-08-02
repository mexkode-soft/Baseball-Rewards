"use client";

import {
  Crown,
  MapPin,
  Medal,
  Shield,
  Star,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readRanking, type RankingPlayer } from "@/lib/ranking";
import { readSeasons, type Season } from "@/lib/seasons";
import styles from "./Ranking.module.css";

function formatPoints(points: number) {
  return new Intl.NumberFormat("es-MX").format(points);
}

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
  if (player.photo) {
    return (
      <img
        src={player.photo}
        alt={`Foto de ${player.name}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return <UserRound aria-hidden="true" />;
}

function PositionBadge({ position }: { position: number }) {
  const className =
    position === 1
      ? styles.goldPosition
      : position === 2
        ? styles.silverPosition
        : position === 3
          ? styles.bronzePosition
          : "";

  return (
    <div className={`${styles.position} ${className}`}>
      {position <= 3 ? <Medal /> : <span>#</span>}
      <strong>{position}</strong>
    </div>
  );
}

export default function RankingPage() {
  const [players, setPlayers] = useState<RankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");

  useEffect(() => {
    let active = true;
    void readSeasons().then((items) => {
      if (!active) return;
      setSeasons(items);
      setSeasonId((current) => current || items.find((item) => item.status === "active")?.id || items[0]?.id || "");
    }).catch((error) => setMessage(error instanceof Error ? error.message : "No se pudieron cargar las temporadas."));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    let active = true;
    setLoading(true);
    void readRanking(100, seasonId)
      .then((result) => { if (active) setPlayers(result); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "No se pudo cargar el ranking."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [seasonId]);

  const podium = useMemo(() => players.slice(0, 3), [players]);
  const selectedSeason = seasons.find((item) => item.id === seasonId) ?? null;
  const formatSeasonDate = (value: string) => value ? new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "Sin fecha";

  return (
    <>
      <header className={styles.pageTitle}>
        <span>Clasificación general</span>
        <h1>Ranking</h1>
        <p>Consulta puntos y posiciones por temporada. Los puntos de temporadas anteriores se conservan como histórico.</p>
        <div className={styles.seasonControls}>
          <label>Temporada
            <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
              {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
            </select>
          </label>
          {selectedSeason && <div className={styles.seasonDates}><span>Inicio de temporada <strong>{formatSeasonDate(selectedSeason.startsAt)}</strong></span><span>Fin de temporada <strong>{formatSeasonDate(selectedSeason.endsAt)}</strong></span></div>}
        </div>
      </header>

      {message && <div className={styles.statusMessage}>{message}</div>}

      {!loading && podium.length > 0 && (
        <section className={styles.podiumSection}>
          <div className={styles.podiumHeading}>
            <div>
              <span>Líderes de la temporada</span>
              <h2>El podio de los campeones</h2>
            </div>

            <div className={styles.seasonBadge}>
              <Trophy />
              {selectedSeason?.name ?? "Sin temporada"}
            </div>
          </div>

          <div
            className={`${styles.podium} ${
              podium.length === 1
                ? styles.singlePodium
                : podium.length === 2
                  ? styles.doublePodium
                  : ""
            }`}
          >
            {podium.map((player, index) => (
              <article
                key={player.id}
                className={`${styles.podiumPlayer} ${
                  index === 0
                    ? styles.firstPlace
                    : index === 1
                      ? styles.secondPlace
                      : styles.thirdPlace
                }`}
              >
                {index === 0 && (
                  <div className={styles.championCrown}>
                    <Crown />
                  </div>
                )}

                <div className={styles.medal}>
                  <Medal />
                  <span>{index + 1}</span>
                </div>

                <div className={styles.podiumPhoto}>
                  <Avatar player={player} />
                </div>

                <div className={styles.playerInformation}>
                  <strong>{player.name}</strong>
                  <span>{player.state || "Sin ubicación"}</span>
                  <b>{formatPoints(player.points)} pts</b>
                </div>

                <div className={styles.podiumBase}>
                  <span>
                    {index === 0 ? "Oro" : index === 1 ? "Plata" : "Bronce"}
                  </span>
                  <strong>{index + 1}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className={styles.rankingCard}>
        <div className={styles.tableHeading}>
          <div>
            <span>Tabla general</span>
            <h2>Todos los participantes</h2>
            <p>
              La clasificación se actualiza con los movimientos de puntos
              registrados en Supabase.
            </p>
          </div>

          <div className={styles.playersCount}>
            <UsersRound />
            <div>
              <strong>{players.length}</strong>
              <span>{players.length === 1 ? "jugador" : "jugadores"}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}>Cargando ranking...</div>
        ) : players.length === 0 ? (
          <div className={styles.emptyState}>
            <Trophy />
            <strong>Aún no hay participantes con puntos.</strong>
          </div>
        ) : (
          <div className={styles.tableScroller}>
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Participante</th>
                  <th>Ubicación</th>
                  <th>Nivel</th>
                  <th>Puntos</th>
                </tr>
              </thead>

              <tbody>
                {players.map((player, index) => {
                  const position = index + 1;

                  return (
                    <tr
                      key={player.id}
                      className={position <= 3 ? styles.highlightedRow : ""}
                    >
                      <td>
                        <PositionBadge position={position} />
                      </td>

                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.tableAvatar}>
                            <Avatar player={player} />
                          </div>
                          <div>
                            <strong>{player.name}</strong>
                            <span>Participante de Home Run Rewards</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className={styles.stateCell}>
                          <MapPin />
                          {player.state || "Sin ubicación"}
                        </div>
                      </td>

                      <td>
                        <div
                          className={`${styles.levelBadge} ${levelClass(
                            player.level
                          )}`}
                        >
                          <LevelIcon level={player.level} />
                          {player.level}
                        </div>
                      </td>

                      <td>
                        <strong className={styles.points}>
                          {formatPoints(player.points)} pts
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
