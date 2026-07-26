"use client";

import {
  BadgePercent,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Gift,
  Handshake,
  LocateFixed,
  MapPin,
  Navigation,
  PackageCheck,
  PartyPopper,
  Route,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import styles from "./CazarRecompensas.module.css";
import {
  DEFAULT_DEMO_CONFIG,
  DEMO_CONFIG_EVENT,
  readDemoConfig,
  type DemoConfig,
} from "@/lib/demoConfig";

type RewardType =
  | "Promoción sorpresa"
  | "Descuento"
  | "Colaboración de marca";

interface Reward {
  id: number;
  name: string;
  type: RewardType;
  brand: string;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
  initialDistance: number;
  availableUnits: number;
  rewardCode: string;
}

interface CollectedReward {
  id: string;
  rewardId: number;
  name: string;
  code: string;
  collectedAt: string;
  expiresAt: string;
}

interface Question {
  id: number;
  text: string;
  category: "baseball" | "general" | "marca";
  brand?: string;
  answers: [string, string, string];
  correctAnswer: number;
}

const ACTIVATION_RADIUS = 15;
const MAXIMUM_DISTANCE = 250;
const QUESTION_TIME = 5;
const COOLDOWN_HOURS = 24;
const REWARD_VALID_DAYS = 30;

const COLLECTED_STORAGE_KEY = "hrr-collected-rewards";
const COOLDOWN_STORAGE_KEY = "hrr-reward-cooldowns";

const initialRewards: Reward[] = [
  {
    id: 1,
    name: "Premio sorpresa del partido",
    type: "Promoción sorpresa",
    brand: "Home Run Rewards",
    locationName: "Entrada principal",
    address: "Zona de acceso principal del estadio",
    latitude: 19.432608,
    longitude: -99.133209,
    initialDistance: 128,
    availableUnits: 15,
    rewardCode: "HOMERUN15",
  },
  {
    id: 2,
    name: "20% de descuento en alimentos",
    type: "Descuento",
    brand: "Zona Food",
    locationName: "Zona de alimentos",
    address: "Pasillo central, sección de alimentos",
    latitude: 19.43305,
    longitude: -99.13275,
    initialDistance: 84,
    availableUnits: 24,
    rewardCode: "ZONAFOOD20",
  },
  {
    id: 3,
    name: "Kit especial de patrocinador",
    type: "Colaboración de marca",
    brand: "Baseball Club",
    locationName: "Tienda oficial",
    address: "Zona comercial, acceso norte",
    latitude: 19.43195,
    longitude: -99.13215,
    initialDistance: 210,
    availableUnits: 8,
    rewardCode: "BASEBALLKIT",
  },
];

const questions: Question[] = [
  { id: 1, text: "¿Cuántos strikes provocan un ponche?", category: "baseball", answers: ["Dos", "Tres", "Cuatro"], correctAnswer: 1 },
  { id: 2, text: "¿Cuántas bases tiene un campo de béisbol?", category: "baseball", answers: ["Tres", "Cuatro", "Cinco"], correctAnswer: 1 },
  { id: 3, text: "¿Cuántos outs terminan una media entrada?", category: "baseball", answers: ["Dos", "Tres", "Cuatro"], correctAnswer: 1 },
  { id: 4, text: "¿Qué jugador lanza hacia el bateador?", category: "baseball", answers: ["Catcher", "Pitcher", "Shortstop"], correctAnswer: 1 },
  { id: 5, text: "¿Qué significa conectar un home run?", category: "baseball", answers: ["Cambiar de bateador", "Recorrer todas las bases", "Salir del campo"], correctAnswer: 1 },
  { id: 6, text: "¿Cuál es la capital de México?", category: "general", answers: ["Guadalajara", "Ciudad de México", "Monterrey"], correctAnswer: 1 },
  { id: 7, text: "¿Cuántos días tiene una semana?", category: "general", answers: ["Cinco", "Siete", "Diez"], correctAnswer: 1 },
  { id: 8, text: "¿Cuál es el planeta más cercano al Sol?", category: "general", answers: ["Venus", "Mercurio", "Marte"], correctAnswer: 1 },
  { id: 9, text: "¿Qué experiencia ofrece Home Run Rewards?", category: "marca", brand: "Home Run Rewards", answers: ["Venta de automóviles", "Campañas interactivas", "Cursos de cocina"], correctAnswer: 1 },
  { id: 10, text: "¿Qué puedes encontrar en Home Run Rewards?", category: "marca", brand: "Home Run Rewards", answers: ["Créditos bancarios", "Recompensas", "Boletos de avión"], correctAnswer: 1 },
  { id: 11, text: "¿Qué ofrece Zona Food?", category: "marca", brand: "Zona Food", answers: ["Equipos de cómputo", "Alimentos y bebidas", "Muebles"], correctAnswer: 1 },
  { id: 12, text: "¿Qué premio ofrece Baseball Club?", category: "marca", brand: "Baseball Club", answers: ["Un automóvil", "Un kit especial", "Un viaje internacional"], correctAnswer: 1 },
];

function getQuestions(type: RewardType, brand: string) {
  let available = questions.filter((question) => {
    if (type === "Descuento") return question.category === "baseball";
    if (type === "Promoción sorpresa") {
      return question.category === "baseball" || question.category === "general";
    }
    return question.category === "marca" && question.brand === brand;
  });

  if (available.length < 3) {
    available = questions.filter((question) => question.category === "baseball");
  }

  return [...available].sort(() => Math.random() - 0.5).slice(0, 3);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatRemainingTime(milliseconds: number) {
  const totalMinutes = Math.ceil(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

function rewardIcon(type: RewardType) {
  if (type === "Promoción sorpresa") return <PartyPopper />;
  if (type === "Descuento") return <BadgePercent />;
  return <Handshake />;
}

export default function CazarRecompensasPage() {
  const [rewards, setRewards] = useState(initialRewards);
  const [selectedId, setSelectedId] = useState(initialRewards[0].id);
  const [distances, setDistances] = useState<Record<number, number>>(
    Object.fromEntries(initialRewards.map((reward) => [reward.id, reward.initialDistance]))
  );
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [collectedRewards, setCollectedRewards] = useState<CollectedReward[]>([]);
  const [cooldowns, setCooldowns] = useState<Record<number, string>>({});
  const [storageReady, setStorageReady] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [
    demoConfig,
    setDemoConfig,
  ] = useState<DemoConfig>(
    DEFAULT_DEMO_CONFIG
  );

  useEffect(() => {
    function updateDemoConfig() {
      setDemoConfig(
        readDemoConfig()
      );
    }

    function handleStorage(
      event: StorageEvent
    ) {
      if (
        event.key ===
        "hrr-demo-config"
      ) {
        updateDemoConfig();
      }
    }

    updateDemoConfig();

    window.addEventListener(
      DEMO_CONFIG_EVENT,
      updateDemoConfig
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        DEMO_CONFIG_EVENT,
        updateDemoConfig
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  useEffect(() => {
    try {
      const storedCollected = window.localStorage.getItem(COLLECTED_STORAGE_KEY);
      const storedCooldowns = window.localStorage.getItem(COOLDOWN_STORAGE_KEY);

      if (storedCollected) {
        setCollectedRewards(JSON.parse(storedCollected) as CollectedReward[]);
      }

      if (storedCooldowns) {
        setCooldowns(JSON.parse(storedCooldowns) as Record<number, string>);
      }
    } catch (error) {
      console.warn("No fue posible leer las recompensas guardadas:", error);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(COLLECTED_STORAGE_KEY, JSON.stringify(collectedRewards));
  }, [collectedRewards, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
  }, [cooldowns, storageReady]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const selected = useMemo(
    () => rewards.find((reward) => reward.id === selectedId) ?? rewards[0],
    [rewards, selectedId]
  );

  const distance = distances[selected.id] ?? selected.initialDistance;
  const progress = Math.max(
    0,
    Math.min(
      100,
      ((MAXIMUM_DISTANCE - distance) /
        (MAXIMUM_DISTANCE - ACTIVATION_RADIUS)) *
        100
    )
  );
  const cooldownRemaining = Math.max(
    0,
    (cooldowns[selected.id] ? new Date(cooldowns[selected.id]).getTime() : 0) - now
  );
  const isOnCooldown =
    demoConfig.enable24HourCooldown &&
    cooldownRemaining > 0;
  const hasAlreadyCollectedSelected = collectedRewards.some(
    (item) => item.rewardId === selected.id
  );
  const isBlockedByPreviousWin =
    demoConfig.blockAlreadyCollectedRewards &&
    hasAlreadyCollectedSelected;
  const claimEnabled =
    distance <= ACTIVATION_RADIUS &&
    selected.availableUnits > 0 &&
    !isOnCooldown &&
    !isBlockedByPreviousWin;
  const latestCollectedForSelected = collectedRewards.find(
    (item) => item.rewardId === selected.id
  );
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`;

  function selectReward(rewardId: number) {
    setSelectedId(rewardId);

    window.setTimeout(() => {
      document
        .getElementById("reward-tracker")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 80);
  }

  function changeDistance(delta: number) {
    setDistances((current) => ({
      ...current,
      [selected.id]: Math.max(0, Math.min(MAXIMUM_DISTANCE, distance + delta)),
    }));
  }

  function rewardWon() {
    const collectedAt = new Date();
    const expiresAt = new Date(collectedAt);
    expiresAt.setDate(expiresAt.getDate() + REWARD_VALID_DAYS);

    setRewards((current) =>
      current.map((reward) =>
        reward.id === selected.id
          ? { ...reward, availableUnits: Math.max(0, reward.availableUnits - 1) }
          : reward
      )
    );

    setCollectedRewards((current) => [
      {
        id: `${selected.id}-${collectedAt.getTime()}`,
        rewardId: selected.id,
        name: selected.name,
        code: selected.rewardCode,
        collectedAt: collectedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      ...current,
    ]);

    setCooldowns((current) => {
      const next = { ...current };
      delete next[selected.id];
      return next;
    });
  }

  function rewardFailed() {
    if (!demoConfig.enable24HourCooldown) {
      return;
    }

    const cooldownUntil = new Date(
      Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000
    ).toISOString();

    setCooldowns((current) => ({
      ...current,
      [selected.id]: cooldownUntil,
    }));
    setNow(Date.now());
  }

  return (
    <>
      <div className={styles.pageTitle}>
        <span>Experiencia interactiva</span>
        <h1>Cazar recompensas</h1>
        <p>Selecciona una recompensa, acércate y completa el reto para reclamarla.</p>
      </div>

      <section className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <span>Recompensas disponibles</span>
            <h2>Elige tu siguiente objetivo</h2>
            <p>Las ubicaciones y distancias están simuladas en esta demo.</p>
          </div>
          <div className={styles.count}><Gift /><strong>{rewards.length}</strong><span>recompensas</span></div>
        </div>

        <div className={styles.mobileScrollHint}>
          <span>Desliza para ver más premios</span>
          <strong>← mueve la tabla →</strong>
        </div>

        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Recompensa</th>
                <th>Marca</th>
                <th>Ubicación</th>
                <th>Unidades disponibles</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((reward) => {
                const selectedRow = reward.id === selected.id;
                const soldOut = reward.availableUnits === 0;
                const alreadyCollected = collectedRewards.some(
                  (item) => item.rewardId === reward.id
                );
                const blockedByPreviousWin =
                  demoConfig.blockAlreadyCollectedRewards &&
                  alreadyCollected;

                return (
                  <tr key={reward.id} className={selectedRow ? styles.selectedRow : ""}>
                    <td><div className={styles.typeBadge}>{rewardIcon(reward.type)}<span>{reward.type}</span></div></td>
                    <td><strong>{reward.name}</strong></td>
                    <td><div className={styles.inlineCell}><Sparkles />{reward.brand}</div></td>
                    <td><div className={styles.location}><MapPin /><div><strong>{reward.locationName}</strong><span>{reward.address}</span></div></div></td>
                    <td><div className={`${styles.units} ${soldOut ? styles.soldOut : ""}`}><PackageCheck /><strong>{reward.availableUnits}</strong><span>unidades</span></div></td>
                    <td>
                      <button
                        type="button"
                        className={selectedRow ? styles.selectedButton : styles.goButton}
                        disabled={soldOut || blockedByPreviousWin}
                        onClick={() => selectReward(reward.id)}
                      >
                        <Navigation />
                        {soldOut ? "Agotada" : blockedByPreviousWin ? "Ya obtenido" : selectedRow ? "Seleccionada" : "Ir por ella"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.tracker}`} id="reward-tracker">
        <div className={styles.gameSectionBadge}>
          <Target />
          <div>
            <span>Zona de juego</span>
            <strong>Acércate y reclama tu premio</strong>
          </div>
        </div>
        <div className={styles.trackerTitle}>
          <div className={styles.trackerIdentity}>
            <LocateFixed />
            <div>
              <span>Recompensa seleccionada</span>
              <h2>{selected.name}</h2>
              <p>{selected.brand} · {selected.locationName}</p>
            </div>
          </div>

          {latestCollectedForSelected && (
            <div className={styles.acquiredCode}>
              <span>Código adquirido</span>
              <strong>{latestCollectedForSelected.code}</strong>
              <small>Vence {formatDate(latestCollectedForSelected.expiresAt)}</small>
            </div>
          )}
        </div>

        <div className={styles.metrics}>
          <article><Target /><span>Radio de activación</span><strong>±{ACTIVATION_RADIUS} m</strong></article>
          <article><Route /><span>Distancia actual</span><strong>{distance} m</strong></article>
          <article>
            <Gift />
            <span>Estado</span>
            <strong>
              {selected.availableUnits === 0
                ? "Agotada"
                : isBlockedByPreviousWin
                  ? "Premio ya obtenido"
                  : isOnCooldown
                  ? `Espera ${formatRemainingTime(cooldownRemaining)}`
                  : claimEnabled
                    ? "Disponible"
                    : "Acércate"}
            </strong>
          </article>
        </div>

        <div className={styles.progressCard}>
          <div className={styles.progressHead}><span>Progreso</span><strong>{Math.round(progress)}%</strong></div>
          <div className={styles.progressTrack}><div style={{ width: `${progress}%` }} /></div>
          <div className={styles.progressLabels}><span>Inicio</span><span>±{ACTIVATION_RADIUS} m</span></div>
        </div>

        <div className={styles.simulation}>
          <div><span>Simulación</span><strong>Modifica la distancia</strong></div>
          <div>
            <button type="button" onClick={() => changeDistance(10)}><ChevronUp />Alejar 10 m</button>
            <button type="button" onClick={() => changeDistance(-10)}><ChevronDown />Acercar 10 m</button>
          </div>
        </div>

        <div className={styles.actions}>
          <a href={mapsUrl} target="_blank" rel="noreferrer"><MapPin />Abrir en Google Maps<ExternalLink /></a>
          <button type="button" disabled={!claimEnabled} onClick={() => setExperienceOpen(true)}>
            <Gift />
            {isBlockedByPreviousWin
              ? "Código ya obtenido"
              : isOnCooldown
                ? `Disponible en ${formatRemainingTime(cooldownRemaining)}`
                : claimEnabled
                ? "Reclamar recompensa"
                : "Acércate para reclamar"}
          </button>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.collectedSection}`}>
        <div className={styles.rewardsSectionBadge}>
          <Trophy />
          <div>
            <span>Historial de premios</span>
            <strong>Tus recompensas ganadas</strong>
          </div>
        </div>
        <div className={styles.heading}>
          <div>
            <span>Premios recolectados</span>
            <h2>Mis recompensas</h2>
            <p>Consulta tus códigos y la vigencia de cada premio obtenido.</p>
          </div>

          <div className={styles.count}>
            <Trophy />
            <strong>{collectedRewards.length}</strong>
            <span>obtenidos</span>
          </div>
        </div>

        {collectedRewards.length > 0 ? (
          <div className={styles.collectedGrid}>
            {collectedRewards.map((item) => (
              <article key={item.id} className={styles.collectedCard}>
                <div className={styles.collectedIcon}><Trophy /></div>
                <span>Premio recolectado</span>
                <h3>{item.name}</h3>
                <div className={styles.collectedMeta}>
                  <CalendarDays />
                  <div>
                    <small>Vigencia</small>
                    <strong>Hasta el {formatDate(item.expiresAt)}</strong>
                  </div>
                </div>
                <div className={styles.collectedCode}>
                  <small>Código</small>
                  <strong>{item.code}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyCollected}>
            <Gift />
            <strong>Aún no tienes premios recolectados</strong>
            <span>Cuando completes una trivia y el reto de la pelota, aparecerán aquí.</span>
          </div>
        )}
      </section>

      {experienceOpen && (
        <RewardExperience
          reward={selected}
          demoConfig={demoConfig}
          onClose={() => setExperienceOpen(false)}
          onWon={rewardWon}
          onFailed={rewardFailed}
        />
      )}
    </>
  );
}

function RewardExperience({
  reward,
  demoConfig,
  onClose,
  onWon,
  onFailed,
}: {
  reward: Reward;
  demoConfig: DemoConfig;
  onClose: () => void;
  onWon: () => void;
  onFailed: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"loading" | "ready" | "error">("loading");
  const [cameraError, setCameraError] = useState("");
  const [stage, setStage] = useState<"trivia" | "failed" | "ball" | "won">("trivia");
  const [selectedQuestions] = useState(() => getQuestions(reward.type, reward.brand));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [locked, setLocked] = useState(false);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [finalCorrectAnswers, setFinalCorrectAnswers] = useState(0);
  const failureRegisteredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function openCamera() {
      setCameraStatus("loading");
      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("error");
        setCameraError("Este navegador no permite acceder a la cámara.");
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        await new Promise<void>((resolve) => {
          if (video.readyState >= HTMLMediaElement.HAVE_METADATA) resolve();
          else video.onloadedmetadata = () => resolve();
        });

        await video.play();
        setCameraStatus("ready");
      } catch (error) {
        console.error("No se pudo abrir la cámara:", error);
        setCameraStatus("error");

        if (error instanceof DOMException) {
          if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            setCameraError("El permiso de cámara está bloqueado. Actívalo desde el icono de cámara del navegador.");
            return;
          }
          if (error.name === "NotFoundError") {
            setCameraError("No se encontró ninguna cámara conectada.");
            return;
          }
          if (error.name === "NotReadableError") {
            setCameraError("La cámara está siendo utilizada por otra aplicación.");
            return;
          }
        }
        setCameraError("No fue posible iniciar la cámara.");
      }
    }

    void openCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  useEffect(() => {
    if (stage !== "trivia" || locked) return;
    if (timeLeft === 0) {
      answer(-1);
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [timeLeft, stage, locked]);

  function answer(answerIndex: number) {
    if (locked) return;
    const currentQuestion = selectedQuestions[questionIndex];
    if (!currentQuestion) return;

    setLocked(true);
    setSelectedAnswerIndex(answerIndex);

    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    const nextCorrect = correct + (isCorrect ? 1 : 0);

    window.setTimeout(() => {
      const isLastQuestion = questionIndex === selectedQuestions.length - 1;
      if (isLastQuestion) {
        setFinalCorrectAnswers(nextCorrect);

        if (nextCorrect === selectedQuestions.length) {
          setStage("ball");
        } else {
          if (!failureRegisteredRef.current) {
            failureRegisteredRef.current = true;
            onFailed();
          }
          setStage("failed");
        }
        return;
      }
      setCorrect(nextCorrect);
      setQuestionIndex((value) => value + 1);
      setTimeLeft(QUESTION_TIME);
      setSelectedAnswerIndex(null);
      setLocked(false);
    }, 900);
  }

  function finishWin() {
    onWon();
    setStage("won");
  }

  const question = selectedQuestions[questionIndex];

  return (
    <div className={styles.modal}>
      <div className={styles.experience}>
        <video
          ref={videoRef}
          className={`${styles.camera} ${cameraStatus === "ready" ? styles.cameraReady : ""}`}
          autoPlay
          muted
          playsInline
          preload="auto"
        />

        {cameraStatus === "loading" && (
          <div className={styles.cameraMessage}>
            <Camera />
            <strong>Iniciando cámara...</strong>
            <span>Autoriza el permiso cuando aparezca en el navegador.</span>
          </div>
        )}

        {cameraStatus === "error" && (
          <div className={styles.cameraMessage}>
            <Camera />
            <strong>Cámara no disponible</strong>
            <span>{cameraError}</span>
            <button type="button" onClick={() => window.location.reload()}>Volver a intentar</button>
          </div>
        )}

        <button type="button" className={styles.closeModal} onClick={onClose} aria-label="Cerrar experiencia"><X /></button>
        <div className={styles.cameraBadge}><Camera />Trivia de recompensa</div>

        {stage === "trivia" && question && (
          <div className={styles.triviaCard}>
            <div className={styles.triviaTop}><span>Pregunta {questionIndex + 1} de 3</span><strong>{timeLeft} s</strong></div>
            <h2>{question.text}</h2>
            <div className={styles.answers}>
              {question.answers.map((item, index) => {
                const isSelected = selectedAnswerIndex === index;
                const isCorrectAnswer = index === question.correctAnswer;
                const showCorrect = selectedAnswerIndex !== null && isCorrectAnswer;
                const showWrong = isSelected && !isCorrectAnswer;

                return (
                  <button
                    key={`${question.id}-${index}`}
                    type="button"
                    disabled={locked}
                    className={`${styles.answerButton} ${showCorrect ? styles.correctAnswer : ""} ${showWrong ? styles.wrongAnswer : ""}`}
                    onClick={() => answer(index)}
                  >
                    <span>{String.fromCharCode(65 + index)}</span>{item}
                  </button>
                );
              })}
            </div>
            <small>Selecciona la respuesta correcta antes de que termine el tiempo.</small>
          </div>
        )}

        {stage === "failed" && (
          <div className={styles.resultCard}>
            <Clock3 />
            <span>Reto no completado</span>
            <h2>{finalCorrectAnswers} de {selectedQuestions.length} correctas</h2>
            <p>
              {demoConfig.enable24HourCooldown
                ? "No podrás participar por este premio nuevamente hasta dentro de 24 horas."
                : "La regla de espera de 24 horas está desactivada para esta demo."}
            </p>
            <button type="button" onClick={onClose}>Cerrar experiencia</button>
          </div>
        )}

        {stage === "ball" && <BallChallenge rewardName={reward.name} onWon={finishWin} />}

        {stage === "won" && (
          <>
            <ConfettiEffect />
            <div className={styles.resultCard}>
              <Trophy /><span>¡Home Run!</span><h2>Ganaste la recompensa</h2><p>{reward.name}</p>
              <div className={styles.rewardCode}><span>Código de recompensa</span><strong>{reward.rewardCode}</strong></div>
              <button type="button" onClick={onClose}>Finalizar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BallChallenge({
  rewardName,
  onWon,
}: {
  rewardName: string;
  onWon: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const draggingRef = useRef(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0 });
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStartDistance = useRef(0);
  const pinchStartScale = useRef(1);
  const wonRef = useRef(false);

  useEffect(() => {
    setIsTouchDevice(
      window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const area = areaRef.current;
    if (!canvas || !area) return;

    let disposed = false;
    let frame = 0;
    let baseball: THREE.Object3D | null = null;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, area.clientWidth / area.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(area.clientWidth, area.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    scene.add(new THREE.AmbientLight(0xffffff, 2.4));
    const light = new THREE.DirectionalLight(0xffffff, 3.4);
    light.position.set(3, 4, 5);
    scene.add(light);

    new GLTFLoader().load(
      "/models/baseball.glb",
      (gltf) => {
        if (disposed) return;
        baseball = gltf.scene;
        const box = new THREE.Box3().setFromObject(baseball);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        baseball.position.sub(center);
        const largest = Math.max(size.x, size.y, size.z);
        if (largest > 0) baseball.scale.setScalar(2.7 / largest);
        scene.add(baseball);
      },
      undefined,
      (error) => console.error("No se pudo cargar la pelota:", error)
    );

    function animate() {
      if (disposed) return;
      frame = window.requestAnimationFrame(animate);
      if (baseball) baseball.rotation.y += 0.008;
      renderer.render(scene, camera);
    }

    function handleResize() {
      const currentArea = areaRef.current;
      if (!currentArea || disposed) return;
      const width = currentArea.clientWidth;
      const height = currentArea.clientHeight;
      if (width <= 0 || height <= 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(area);
    animate();

    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.renderLists.dispose();
      renderer.dispose();
    };
  }, []);

  function distanceBetween(first: { x: number; y: number }, second: { x: number; y: number }) {
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  function triggerWin() {
    if (wonRef.current) return;
    wonRef.current = true;
    onWon();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (isTouchDevice && activePointers.current.size === 2) {
      const pointers = Array.from(activePointers.current.values());
      pinchStartDistance.current = distanceBetween(pointers[0], pointers[1]);
      pinchStartScale.current = scale;
      return;
    }

    if (!isTouchDevice) {
      draggingRef.current = true;
      startPointer.current = { x: event.clientX, y: event.clientY };
      startPosition.current = position;
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!activePointers.current.has(event.pointerId)) return;
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (isTouchDevice && activePointers.current.size >= 2) {
      const pointers = Array.from(activePointers.current.values());
      const currentDistance = distanceBetween(pointers[0], pointers[1]);
      if (pinchStartDistance.current <= 0) return;

      const nextScale = Math.max(
        1,
        Math.min(3.5, pinchStartScale.current * (currentDistance / pinchStartDistance.current))
      );
      setScale(nextScale);
      if (nextScale >= 2.7) triggerWin();
      return;
    }

    if (!isTouchDevice && draggingRef.current) {
      const nextPosition = {
        x: startPosition.current.x + event.clientX - startPointer.current.x,
        y: startPosition.current.y + event.clientY - startPointer.current.y,
      };
      setPosition(nextPosition);

      const area = areaRef.current;
      if (
        area &&
        (Math.abs(nextPosition.x) > area.clientWidth * 0.62 ||
          Math.abs(nextPosition.y) > area.clientHeight * 0.62)
      ) {
        triggerWin();
      }
    }
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    activePointers.current.delete(event.pointerId);
    draggingRef.current = false;
    if (activePointers.current.size < 2) {
      pinchStartDistance.current = 0;
      pinchStartScale.current = scale;
    }
  }

  return (
    <div className={styles.ballOverlay}>
      <div className={styles.ballHeading}>
        <span>Último reto</span>
        <h2>{isTouchDevice ? "Haz crecer la pelota" : "Saca la pelota de la pantalla"}</h2>
        <p>
          {isTouchDevice
            ? "Usa dos dedos para agrandarla hasta que desborde la pantalla."
            : `Arrástrala fuera del área para ganar: ${rewardName}`}
        </p>
      </div>

      <div
        ref={areaRef}
        className={styles.ballArea}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className={styles.ballLayer}
          style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})` }}
        >
          <canvas ref={canvasRef} />
        </div>
        <div className={styles.ballInstructions}>
          {isTouchDevice ? `Tamaño: ${Math.round(scale * 100)}%` : "Arrastra en cualquier dirección"}
        </div>
      </div>
    </div>
  );
}

function ConfettiEffect() {
  const pieces = useMemo(
    () => Array.from({ length: 90 }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2.2 + Math.random() * 1.8,
    })),
    []
  );

  return (
    <div className={styles.confetti} aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

