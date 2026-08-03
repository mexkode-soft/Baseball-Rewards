"use client";

import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Navigation,
  XCircle,
} from "lucide-react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "../../CazarRecompensas.module.css";

import ARBaseballReward from "@/components/ARBaseballReward";

import {
  awardDynamicReward,
  cooldownRemaining,
  distanceMeters,
  readActiveDynamicCampaigns,
  selectCampaignQuestions,
  setMapCooldown,
  type CampaignLocation,
  type MapCampaign,
  type BrandCampaign,
} from "@/lib/campaignDynamics";

import {
  readQuestions,
  type TriviaQuestion,
} from "@/lib/questions";

import {
  DEFAULT_DEMO_CONFIG,
  DEMO_CONFIG_EVENT,
  readDemoConfig,
  type DemoConfig,
} from "@/lib/demoConfig";

type Phase =
  | "location"
  | "permission"
  | "ready"
  | "countdown"
  | "quiz"
  | "failed"
  | "ball"
  | "done";

export default function MapPlayPage() {
  const params = useSearchParams();

  const campaignId =
    params.get("campaign") ?? "";

  const locationId = params.get("location") ?? "";
  const mode = params.get("mode") === "brand" ? "brand" : "map";

  const [campaign, setCampaign] = useState<MapCampaign | BrandCampaign | null>(null);

  useEffect(() => {
    let active = true;
    void readActiveDynamicCampaigns(mode).then((items) => {
      if (active) {
        setCampaign((items as Array<MapCampaign | BrandCampaign>).find((item) => item.id === campaignId) ?? null);
      }
    });
    return () => { active = false; };
  }, [campaignId, mode]);

  const location =
    campaign?.locations.find(
      (item) =>
        item.id === locationId
    ) ??
    campaign?.locations[0];

  const [phase, setPhase] =
    useState<Phase>("location");

  const [distance, setDistance] =
    useState<number | null>(null);

  const [count, setCount] =
    useState("¿Listo?");

  const [questions, setQuestions] =
    useState<TriviaQuestion[]>([]);

  const [index, setIndex] =
    useState(0);

  const [time, setTime] =
    useState(5);

  const [selected, setSelected] =
    useState<number | null>(null);

  const [correct, setCorrect] =
    useState(0);

  const [watching, setWatching] =
    useState(false);

  const [
    demoConfig,
    setDemoConfig,
  ] =
    useState<DemoConfig>(
      DEFAULT_DEMO_CONFIG
    );

  const [remaining, setRemaining] = useState(0);

  const videoRef =
    useRef<HTMLVideoElement>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const watchRef =
    useRef<number | null>(null);

  const trackingStartedRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function updateDemoConfig() {
      try { const value = await readDemoConfig(); if (active) setDemoConfig(value); } catch { /* configuración predeterminada */ }
    }
    void updateDemoConfig();
    const refresh = () => { void updateDemoConfig(); };
    window.addEventListener(DEMO_CONFIG_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(DEMO_CONFIG_EVENT, refresh);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  useEffect(() => {
    if (
      phase !== "quiz" ||
      selected !== null
    ) {
      return;
    }

    setTime(5);

    const timer =
      window.setInterval(
        () => {
          setTime(
            (value) => {
              if (value <= 1) {
                window.clearInterval(
                  timer
                );

                setSelected(-1);

                window.setTimeout(
                  () => { void next(false); },
                  850
                );

                return 0;
              }

              return value - 1;
            }
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    phase,
    index,
    selected,
  ]);

  useEffect(() => {
    if (!campaign || !location) return;
    void cooldownRemaining(campaign.id, location.id).then(setRemaining).catch(() => setRemaining(0));
  }, [campaign, location]);


  useEffect(() => {
    if (!campaign || !location || phase !== "location" || trackingStartedRef.current) return;
    trackingStartedRef.current = true;
    void locate();
  }, [campaign, location, phase, demoConfig.simulatedLocationEnabled]);
  if (
    !campaign ||
    !location
  ) {
    return (
      <main
        className={
          styles.mobileStage
        }
      >
        <section
          className={
            styles.emptyCard
          }
        >
          <XCircle />

          <h2>
            Campaña no disponible
          </h2>
        </section>
      </main>
    );
  }

  /*
   * Estas referencias quedan tipadas
   * como valores válidos después del guard.
   * Se usan dentro de funciones internas
   * para evitar errores de posiblemente undefined.
   */
  const activeCampaign:
    MapCampaign | BrandCampaign = campaign;

  const activeLocation:
    CampaignLocation = location;

  const q =
    questions[index];

  const progress =
    distance === null
      ? 0
      : distance <=
          activeLocation.radius
        ? 100
        : Math.max(
            0,
            Math.min(
              99,
              (
                (
                  1000 -
                  Math.min(
                    distance,
                    1000
                  )
                ) /
                Math.max(
                  1,
                  1000 -
                    activeLocation.radius
                )
              ) * 100
            )
          );

  const mapsUrl =
    `https://www.google.com/maps/dir/?api=1&destination=${activeLocation.latitude},${activeLocation.longitude}`;

  function applyPosition(
    latitude: number,
    longitude: number
  ) {
    const meters =
      distanceMeters(
        latitude,
        longitude,
        activeLocation.latitude,
        activeLocation.longitude
      );

    setDistance(
      Math.round(meters)
    );

    if (
      meters <=
      activeLocation.radius
    ) {
      if (
        watchRef.current !== null
      ) {
        navigator.geolocation.clearWatch(
          watchRef.current
        );

        watchRef.current = null;
      }

      setWatching(false);

      setPhase(
        "permission"
      );
    }
  }

  async function locate() {
    if (watchRef.current !== null) return;
    const demo = await readDemoConfig();

    if (demo.simulatedLocationEnabled) {
      setDistance(0);
      setWatching(false);
      setPhase("permission");
      return;
    }

    if (
      !navigator.geolocation
    ) {
      setDistance(-1);

      return;
    }

    setWatching(true);

    watchRef.current =
      navigator.geolocation.watchPosition(
        (position) => {
          applyPosition(
            position.coords.latitude,
            position.coords.longitude
          );
        },
        () => {
          setDistance(-1);
          setWatching(false);
        },
        {
          enableHighAccuracy:
            true,
          timeout: 15000,
          maximumAge: 3000,
        }
      );
  }

  async function camera() {
    try {
      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            video: {
              facingMode:
                "environment",
            },
            audio: false,
          });

      streamRef.current =
        stream;

      if (
        videoRef.current
      ) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();
      }
    } catch (error) {
      console.warn(
        "La cámara no quedó disponible:",
        error
      );
    }

    setPhase("ready");
  }

  async function begin() {
    const bank = await readQuestions();
    setQuestions(selectCampaignQuestions(activeCampaign, bank));
    setPhase("countdown");

    const values = [
      "3",
      "2",
      "1",
      "GO",
    ];

    let current = 0;

    setCount(
      values[current]
    );

    const timer =
      window.setInterval(
        () => {
          current += 1;

          if (
            current >=
            values.length
          ) {
            window.clearInterval(
              timer
            );

            // Las preguntas se cargan antes de iniciar la cuenta regresiva.

            setPhase("quiz");
            setIndex(0);
            setCorrect(0);
            setSelected(null);
            setTime(5);

            return;
          }

          setCount(
            values[current]
          );
        },
        700
      );
  }

  function answer(
    choice: number
  ) {
    if (
      selected !== null
    ) {
      return;
    }

    setSelected(choice);

    const isCorrect =
      choice ===
      questions[index]
        .correctAnswer;

    if (isCorrect) {
      setCorrect(
        (value) =>
          value + 1
      );
    }

    window.setTimeout(
      () =>
        next(isCorrect),
      850
    );
  }

  async function next(
    wasCorrect: boolean
  ) {
    const last =
      index >=
      questions.length - 1;

    setSelected(null);

    if (last) {
      const finalCorrect =
        correct +
        (
          wasCorrect
            ? 1
            : 0
        );

      const score =
        questions.length > 0
          ? (
              finalCorrect /
              questions.length
            ) * 100
          : 0;

      if (
        score >=
        activeCampaign
          .passingPercentage
      ) {
        setPhase("ball");

        return;
      }

      if (
        demoConfig
          .enable24HourCooldown
      ) {
        await setMapCooldown(activeCampaign.id, activeLocation.id);
        setRemaining(activeCampaign.cooldownHours * 60 * 60 * 1000);
      }

      setPhase("failed");

      return;
    }

    setIndex(
      (value) =>
        value + 1
    );
  }

  return (
    <main
      className={`${styles.mobileStage} ${styles.gameStage}`}
    >
      <div
        className={
          styles.topBar
        }
      >
        <Link
          href={mode === "brand" ? "/usuario/cazar-recompensas/marca" : "/usuario/cazar-recompensas/mapa"}
          className={
            styles.backButton
          }
          aria-label="Regresar"
        >
          <ArrowLeft />
        </Link>

        <span>
          {
            activeLocation.name
          }
        </span>
      </div>

      <video
        ref={videoRef}
        className={`${styles.cameraBackground} ${
          [
            "ready",
            "countdown",
            "quiz",
            "ball",
          ].includes(phase)
            ? styles.cameraBackgroundActive
            : ""
        }`}
        muted
        playsInline
      />

      {phase ===
        "location" && (
        <section
          className={
            styles.locationGamePanel
          }
        >
          <div
            className={
              styles.gameOrb
            }
          >
            <MapPin />
          </div>

          <span
            className={
              styles.locationCampaignName
            }
          >
            {
              activeCampaign.name
            }
          </span>

          <h1>
            {
              activeLocation.name
            }
          </h1>

          <p>
            {
              activeLocation.reward
            }{" "}
            · entra a un radio
            de{" "}
            {
              activeLocation.radius
            }{" "}
            metros para
            comenzar.
          </p>

          <div
            className={
              styles.distanceCard
            }
          >
            <div
              className={
                styles.distanceHeader
              }
            >
              <span>
                Progreso hacia
                el premio
              </span>

              <strong>
                {
                  Math.round(
                    progress
                  )
                }
                %
              </strong>
            </div>

            <div
              className={
                styles.distanceTrack
              }
            >
              <div
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <div
              className={
                styles.distanceLabels
              }
            >
              <span>
                {distance ===
                null
                  ? "Ubicación pendiente"
                  : distance < 0
                    ? "Sin permiso"
                    : `Estás a ${distance} m`}
              </span>

              <span>
                Meta:{" "}
                {
                  activeLocation.radius
                }{" "}
                m
              </span>
            </div>
          </div>

          <a
            href={
              mapsUrl
            }
            target="_blank"
            rel="noreferrer"
            className={
              styles.mapsButton
            }
          >
            <Navigation />

            Ver en Google Maps

            <ExternalLink />
          </a>

          {remaining >
          0 ? (
            <div
              className={
                styles.noticeBox
              }
            >
              Podrás intentarlo
              nuevamente en{" "}
              {
                Math.ceil(
                  remaining /
                    3600000
                )
              }{" "}
              horas.
            </div>
          ) : (
            <button
              type="button"
              className={
                styles.cameraButton
              }
              onClick={() => { void locate(); window.open(mapsUrl, "_blank", "noopener,noreferrer"); }}
              disabled={
                watching
              }
            >
              <MapPin />

              {watching
                ? "Siguiendo tu recorrido..."
                : "Ir al objetivo"}
            </button>
          )}

          {distance !==
            null &&
            distance >
              activeLocation.radius && (
              <div
                className={
                  styles.noticeBox
                }
              >
                Sigue
                acercándote. La
                barra se
                actualizará con
                tu ubicación.
              </div>
            )}

          {distance === -1 && (
            <div
              className={
                styles.noticeBox
              }
            >
              No pudimos obtener
              tu ubicación.
              Puedes activar la
              simulación desde el
              módulo Demo.
            </div>
          )}
        </section>
      )}

      {phase ===
        "permission" && (
        <section
          className={
            styles.gameHero
          }
        >
          <div
            className={
              styles.gameOrb
            }
          >
            <Camera />
          </div>

          <h1>
            Activa la cámara
          </h1>

          <p>
            La usaremos como
            fondo para la
            experiencia de
            realidad aumentada.
          </p>

          <button
            type="button"
            className={
              styles.cameraButton
            }
            onClick={
              camera
            }
          >
            <Camera />

            Dar permiso
          </button>
        </section>
      )}

      {phase ===
        "ready" && (
        <section
          className={
            styles.countdownScreen
          }
        >
          <h1>
            ¿Listo?
          </h1>

          <button
            type="button"
            className={
              styles.cameraButton
            }
            onClick={() => { void begin(); }}
          >
            Comenzar
          </button>
        </section>
      )}

      {phase ===
        "countdown" && (
        <section
          className={
            styles.countdownScreen
          }
        >
          <strong>
            {count}
          </strong>
        </section>
      )}

      {phase ===
        "quiz" &&
        q && (
          <section
            className={
              styles.quizCard
            }
          >
            <div
              className={
                styles.quizTop
              }
            >
              <span>
                Pregunta{" "}
                {index + 1}/
                {
                  questions.length
                }
              </span>

              <strong>
                {time}s
              </strong>
            </div>

            <h2>
              {q.text}
            </h2>

            <div
              className={
                styles.answers
              }
            >
              {q.answers.map(
                (
                  answerText,
                  answerIndex
                ) => {
                  const className =
                    selected ===
                    null
                      ? ""
                      : answerIndex ===
                          q.correctAnswer
                        ? styles.answerCorrect
                        : selected ===
                            answerIndex
                          ? styles.answerWrong
                          : "";

                  return (
                    <button
                      key={
                        answerText
                      }
                      type="button"
                      className={
                        className
                      }
                      onClick={() =>
                        answer(
                          answerIndex
                        )
                      }
                      disabled={
                        selected !==
                        null
                      }
                    >
                      <span>
                        {String.fromCharCode(
                          65 +
                            answerIndex
                        )}
                      </span>

                      {
                        answerText
                      }
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}

      {phase ===
        "failed" && (
        <section
          className={
            styles.resultScreen
          }
        >
          <XCircle />

          <span>
            Reto no superado
          </span>

          <h2>
            {demoConfig
              .enable24HourCooldown
              ? "Inténtalo de nuevo en 24 horas"
              : "Puedes intentarlo nuevamente"}
          </h2>

          <p>
            {demoConfig
              .enable24HourCooldown
              ? "La próxima vez tendrás otra selección de preguntas."
              : "El modo demo libre desactivó el bloqueo de espera."}
          </p>
        </section>
      )}

      {phase ===
        "ball" && (
        <section
          className={
            styles.arFull
          }
        >
          <ARBaseballReward
            reward={
              activeLocation.reward
            }
            code={
              activeLocation
                .rewardCode
            }
            onComplete={() => {
              void awardDynamicReward(activeCampaign, activeLocation).then(() => setPhase("done"));
            }}
          />
        </section>
      )}

      {phase ===
        "done" && (
        <section
          className={
            styles.resultScreen
          }
        >
          <CheckCircle2 />

          <span>
            Recompensa
            guardada
          </span>

          <h2>
            {
              activeLocation.reward
            }
          </h2>

          <Link
            className={
              styles.resultPrimary
            }
            href="/usuario/recompensas"
          >
            Ver mis
            recompensas
          </Link>
        </section>
      )}
    </main>
  );
}
