import {
  Crown,
  MapPin,
  Medal,
  Shield,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";

import styles from "./Ranking.module.css";

type PlayerLevel =
  | "Novato"
  | "All Star"
  | "Leyenda";

interface RankingPlayer {
  id: number;
  name: string;
  state: string;
  points: number;
  level: PlayerLevel;
  photo: string;
}

const rankingPlayers: RankingPlayer[] = [
  {
    id: 1,
    name: "Carlos Ramírez",
    state: "Sinaloa",
    points: 9850,
    level: "Leyenda",
    photo:
      "https://i.pravatar.cc/300?img=12",
  },
  {
    id: 2,
    name: "Mariana López",
    state: "Veracruz",
    points: 9210,
    level: "Leyenda",
    photo:
      "https://i.pravatar.cc/300?img=47",
  },
  {
    id: 3,
    name: "José Martínez",
    state: "Sonora",
    points: 8740,
    level: "All Star",
    photo:
      "https://i.pravatar.cc/300?img=11",
  },
  {
    id: 4,
    name: "Fernanda Ruiz",
    state: "Jalisco",
    points: 8100,
    level: "All Star",
    photo:
      "https://i.pravatar.cc/300?img=32",
  },
  {
    id: 5,
    name: "Miguel Torres",
    state: "Nuevo León",
    points: 7650,
    level: "All Star",
    photo:
      "https://i.pravatar.cc/300?img=15",
  },
  {
    id: 6,
    name: "Andrea Salazar",
    state: "Baja California",
    points: 6920,
    level: "All Star",
    photo:
      "https://i.pravatar.cc/300?img=45",
  },
  {
    id: 7,
    name: "Roberto Sánchez",
    state: "Ciudad de México",
    points: 5850,
    level: "Novato",
    photo:
      "https://i.pravatar.cc/300?img=14",
  },
  {
    id: 8,
    name: "Daniela Cruz",
    state: "Puebla",
    points: 5300,
    level: "Novato",
    photo:
      "https://i.pravatar.cc/300?img=49",
  },
  {
    id: 9,
    name: "Luis Hernández",
    state: "Yucatán",
    points: 4780,
    level: "Novato",
    photo:
      "https://i.pravatar.cc/300?img=13",
  },
  {
    id: 10,
    name: "Alejandra Gómez",
    state: "Querétaro",
    points: 4250,
    level: "Novato",
    photo:
      "https://i.pravatar.cc/300?img=44",
  },
];

function formatPoints(points: number) {
  return new Intl.NumberFormat(
    "es-MX"
  ).format(points);
}

function getLevelClass(
  level: PlayerLevel
) {
  if (level === "Leyenda") {
    return styles.legendLevel;
  }

  if (level === "All Star") {
    return styles.allStarLevel;
  }

  return styles.rookieLevel;
}

function getLevelIcon(
  level: PlayerLevel
) {
  if (level === "Leyenda") {
    return <Crown />;
  }

  if (level === "All Star") {
    return <Star />;
  }

  return <Shield />;
}

export default function RankingPage() {
  const firstPlace =
    rankingPlayers[0];

  const secondPlace =
    rankingPlayers[1];

  const thirdPlace =
    rankingPlayers[2];

  return (
    <>
      <div className={styles.pageTitle}>
        <span>
          Clasificación general
        </span>

        <h1>
          Ranking
        </h1>

        <p>
          Conoce a los jugadores con
          más puntos y recompensas
          dentro de Home Run Rewards.
        </p>
      </div>

      <section className={styles.podiumSection}>
        <div className={styles.podiumHeading}>
          <div>
            <span>
              Líderes de la temporada
            </span>

            <h2>
              El podio de los campeones
            </h2>
          </div>

          <div className={styles.seasonBadge}>
            <Trophy />

            Temporada 2026
          </div>
        </div>

        <div className={styles.podium}>
          {/* Segundo lugar */}
          <article
            className={`${styles.podiumPlayer} ${styles.secondPlace}`}
          >
            <div className={styles.medal}>
              <Medal />

              <span>
                2
              </span>
            </div>

            <div className={styles.podiumPhoto}>
              <img
                src={secondPlace.photo}
                alt={`Foto de ${secondPlace.name}`}
              />
            </div>

            <div className={styles.playerInformation}>
              <strong>
                {secondPlace.name}
              </strong>

              <span>
                {secondPlace.state}
              </span>

              <b>
                {formatPoints(
                  secondPlace.points
                )}{" "}
                pts
              </b>
            </div>

            <div className={styles.podiumBase}>
              <span>
                Plata
              </span>

              <strong>
                2
              </strong>
            </div>
          </article>

          {/* Primer lugar */}
          <article
            className={`${styles.podiumPlayer} ${styles.firstPlace}`}
          >
            <div className={styles.championCrown}>
              <Crown />
            </div>

            <div className={styles.medal}>
              <Medal />

              <span>
                1
              </span>
            </div>

            <div className={styles.podiumPhoto}>
              <img
                src={firstPlace.photo}
                alt={`Foto de ${firstPlace.name}`}
              />
            </div>

            <div className={styles.playerInformation}>
              <strong>
                {firstPlace.name}
              </strong>

              <span>
                {firstPlace.state}
              </span>

              <b>
                {formatPoints(
                  firstPlace.points
                )}{" "}
                pts
              </b>
            </div>

            <div className={styles.podiumBase}>
              <span>
                Oro
              </span>

              <strong>
                1
              </strong>
            </div>
          </article>

          {/* Tercer lugar */}
          <article
            className={`${styles.podiumPlayer} ${styles.thirdPlace}`}
          >
            <div className={styles.medal}>
              <Medal />

              <span>
                3
              </span>
            </div>

            <div className={styles.podiumPhoto}>
              <img
                src={thirdPlace.photo}
                alt={`Foto de ${thirdPlace.name}`}
              />
            </div>

            <div className={styles.playerInformation}>
              <strong>
                {thirdPlace.name}
              </strong>

              <span>
                {thirdPlace.state}
              </span>

              <b>
                {formatPoints(
                  thirdPlace.points
                )}{" "}
                pts
              </b>
            </div>

            <div className={styles.podiumBase}>
              <span>
                Bronce
              </span>

              <strong>
                3
              </strong>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.rankingCard}>
        <div className={styles.tableHeading}>
          <div>
            <span>
              Tabla general
            </span>

            <h2>
              Posiciones actuales
            </h2>

            <p>
              Las posiciones se ordenan
              según los puntos obtenidos
              en campañas y recompensas.
            </p>
          </div>

          <div className={styles.playersCount}>
            <Sparkles />

            <div>
              <strong>
                {rankingPlayers.length}
              </strong>

              <span>
                Jugadores
              </span>
            </div>
          </div>
        </div>

        <div className={styles.tableScroller}>
          <table className={styles.rankingTable}>
            <thead>
              <tr>
                <th>
                  Posición
                </th>

                <th>
                  Usuario
                </th>

                <th>
                  Estado
                </th>

                <th>
                  Puntos
                </th>

                <th>
                  Nivel
                </th>
              </tr>
            </thead>

            <tbody>
              {rankingPlayers.map(
                (player, index) => {
                  const position =
                    index + 1;

                  return (
                    <tr
                      key={player.id}
                      className={
                        position <= 3
                          ? styles.highlightedRow
                          : ""
                      }
                    >
                      <td>
                        <div
                          className={`${styles.position} ${
                            position === 1
                              ? styles.goldPosition
                              : position === 2
                                ? styles.silverPosition
                                : position === 3
                                  ? styles.bronzePosition
                                  : ""
                          }`}
                        >
                          {position <= 3 ? (
                            <Medal />
                          ) : (
                            <span>
                              #
                            </span>
                          )}

                          <strong>
                            {position}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <div className={styles.userCell}>
                          <img
                            src={player.photo}
                            alt=""
                          />

                          <div>
                            <strong>
                              {player.name}
                            </strong>

                            <span>
                              Jugador activo
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className={styles.stateCell}>
                          <MapPin />

                          <span>
                            {player.state}
                          </span>
                        </div>
                      </td>

                      <td>
                        <strong className={styles.points}>
                          {formatPoints(
                            player.points
                          )}
                        </strong>
                      </td>

                      <td>
                        <div
                          className={`${styles.levelBadge} ${getLevelClass(
                            player.level
                          )}`}
                        >
                          {getLevelIcon(
                            player.level
                          )}

                          <span>
                            {player.level}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}