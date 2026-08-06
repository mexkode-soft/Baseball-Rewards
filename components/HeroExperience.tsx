"use client";

import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./HeroExperience.module.css";

type DeviceMode = "desktop" | "mobile" | null;
type IntroState = "preparing" | "start" | "hidden";

const MENU_EVENT = "hrr-public-menu-change";

export default function HeroExperience() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autoplayAttemptedRef = useRef(false);
  const menuPausedVideoRef = useRef(false);
  const mountedRef = useRef(true);

  const [deviceMode, setDeviceMode] = useState<DeviceMode>(null);
  const [introState, setIntroState] = useState<IntroState>("preparing");
  const [muted, setMuted] = useState(true);
  const [experienceStarted, setExperienceStarted] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const isCompact = window.innerWidth <= 900;
    setDeviceMode(isTouch || isCompact ? "mobile" : "desktop");

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const playVideo = useCallback(async (restart = false) => {
    const video = videoRef.current;
    if (!video) return false;

    if (restart || video.ended) {
      video.currentTime = 0;
    }

    try {
      await video.play();

      if (!mountedRef.current) return false;

      setIntroState("hidden");
      setExperienceStarted(true);
      setVideoPlaying(true);
      setVideoEnded(false);
      return true;
    } catch (error) {
      console.warn("No se pudo iniciar el video:", error);

      if (mountedRef.current) {
        setIntroState("start");
        setVideoPlaying(false);
      }

      return false;
    }
  }, []);

  const attemptDesktopAutoplay = useCallback(async () => {
    if (deviceMode !== "desktop" || autoplayAttemptedRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return;

    autoplayAttemptedRef.current = true;
    video.muted = true;
    video.defaultMuted = true;
    setMuted(true);

    const played = await playVideo(false);
    if (!played && mountedRef.current) {
      setIntroState("start");
    }
  }, [deviceMode, playVideo]);

  useEffect(() => {
    if (deviceMode === "mobile") {
      const video = videoRef.current;
      if (video && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        setIntroState("start");
      }
    }
  }, [deviceMode]);

  useEffect(() => {
    function handleMenuChange(event: Event) {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      const open = Boolean(customEvent.detail?.open);
      const video = videoRef.current;

      if (!video) return;

      if (open) {
        menuPausedVideoRef.current = !video.paused && !video.ended;
        if (menuPausedVideoRef.current) {
          video.pause();
        }
        return;
      }

      if (menuPausedVideoRef.current && experienceStarted && !videoEnded) {
        menuPausedVideoRef.current = false;
        void video.play().catch(() => {
          setVideoPlaying(false);
        });
      }
    }

    window.addEventListener(MENU_EVENT, handleMenuChange);
    return () => window.removeEventListener(MENU_EVENT, handleMenuChange);
  }, [experienceStarted, videoEnded]);

  async function startExperience() {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    setMuted(true);
    await playVideo(false);
  }

  async function replayVideo() {
    await playVideo(true);
  }

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
  }

  function handleVideoReady() {
    if (deviceMode === "mobile") {
      setIntroState((current) => (current === "hidden" ? current : "start"));
      return;
    }

    if (deviceMode === "desktop") {
      void attemptDesktopAutoplay();
    }
  }

  return (
    <section className={styles.hero} id="inicio">
      <video
        ref={videoRef}
        className={styles.heroVideo}
        muted={muted}
        poster="/media/video-poster.jpg"
        playsInline
        preload={deviceMode === "mobile" ? "metadata" : "auto"}
        disablePictureInPicture
        controls={false}
        onLoadedMetadata={handleVideoReady}
        onCanPlay={handleVideoReady}
        onPlaying={() => {
          setIntroState("hidden");
          setExperienceStarted(true);
          setVideoPlaying(true);
          setVideoEnded(false);
        }}
        onWaiting={() => {
          if (experienceStarted) setVideoPlaying(false);
        }}
        onPause={() => setVideoPlaying(false)}
        onEnded={() => {
          setVideoPlaying(false);
          setVideoEnded(true);
        }}
        onError={(event) => {
          console.error("Error al cargar el video:", event);
          setIntroState("start");
        }}
      >
        <source src="/media/video1.mp4" type="video/mp4" />
        Tu navegador no soporta la reproducción de video.
      </video>

      {introState === "preparing" && (
        <div className={styles.introScreen} aria-live="polite">
          <div className={styles.introLogoWrap}>
            <img
              src="/images/logo-home-run.png"
              alt="Home Run Rewards"
              className={styles.introLogo}
            />
            <div className={styles.introLoader} aria-hidden="true" />
            <p>Preparando experiencia</p>
          </div>
        </div>
      )}

      {introState === "start" && (
        <button
          type="button"
          className={styles.introScreen}
          onClick={startExperience}
          aria-label="Iniciar experiencia"
        >
          <div className={styles.introLogoWrap}>
            <img
              src="/images/logo-home-run.png"
              alt="Home Run Rewards"
              className={styles.introLogo}
            />
            <span className={styles.startPrompt}>
              <Play />
              Iniciar experiencia
            </span>
          </div>
        </button>
      )}

      {experienceStarted && introState === "hidden" && (
        <div className={styles.heroVideoControls}>
          <button
            type="button"
            className={styles.replayButton}
            onClick={replayVideo}
            aria-label="Reproducir nuevamente"
            title="Reproducir nuevamente"
          >
            <RotateCcw />
            <span>Reproducir nuevamente</span>
          </button>

          <button
            type="button"
            className={styles.soundButton}
            onClick={toggleSound}
            aria-label={muted ? "Activar sonido" : "Silenciar video"}
            title={muted ? "Activar sonido" : "Silenciar video"}
          >
            {muted ? <VolumeX /> : <Volume2 />}
            <span>{muted ? "Activar sonido" : "Silenciar"}</span>
          </button>
        </div>
      )}

      {videoEnded && (
        <div className={styles.endedIndicator}>
          <span>Experiencia finalizada</span>
        </div>
      )}

      {!videoPlaying && experienceStarted && !videoEnded && introState === "hidden" && (
        <div className={styles.bufferingIndicator} aria-live="polite">
          Cargando video…
        </div>
      )}
    </section>
  );
}
