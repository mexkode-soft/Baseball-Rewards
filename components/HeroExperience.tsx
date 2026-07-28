"use client";

import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./HeroExperience.module.css";

type DeviceMode =
  | "desktop"
  | "mobile"
  | null;

export default function HeroExperience() {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const [
    deviceMode,
    setDeviceMode,
  ] =
    useState<DeviceMode>(
      null
    );

  const [muted, setMuted] =
    useState(true);

  const [
    videoPrepared,
    setVideoPrepared,
  ] = useState(false);

  const [
    videoPlaying,
    setVideoPlaying,
  ] = useState(false);

  const [
    experienceStarted,
    setExperienceStarted,
  ] = useState(false);

  const [
    autoplayBlocked,
    setAutoplayBlocked,
  ] = useState(false);

  const [
    videoEnded,
    setVideoEnded,
  ] = useState(false);

  /*
   * Detectamos si es móvil o
   * dispositivo táctil.
   */
  useEffect(() => {
    const touchDevice =
      window.matchMedia(
        "(pointer: coarse)"
      ).matches;

    const compactScreen =
      window.innerWidth <=
      900;

    const mode:
      DeviceMode =
      touchDevice ||
      compactScreen
        ? "mobile"
        : "desktop";

    setDeviceMode(mode);
  }, []);

  /*
   * En computadora intentamos
   * reproducir directamente.
   *
   * No esperamos a loadedData,
   * porque algunos navegadores
   * tardan en disparar ese evento.
   */
useEffect(() => {
  if (
    deviceMode !==
    "desktop"
  ) {
    return;
  }

  const currentVideo =
    videoRef.current;

  if (!currentVideo) {
    return;
  }

  let cancelled = false;

  async function startDesktopVideo(
    video:
      HTMLVideoElement
  ) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    setMuted(true);

    try {
      await video.play();

      if (cancelled) {
        return;
      }

      setVideoPrepared(true);
      setExperienceStarted(true);
      setVideoPlaying(true);
      setVideoEnded(false);
      setAutoplayBlocked(false);
    } catch (error) {
      if (cancelled) {
        return;
      }

      console.warn(
        "El navegador bloqueó la reproducción automática:",
        error
      );

      setVideoPrepared(true);
      setExperienceStarted(false);
      setVideoPlaying(false);
      setAutoplayBlocked(true);
    }
  }

  void startDesktopVideo(
    currentVideo
  );

  const retryTimeout =
    window.setTimeout(() => {
      if (
        !cancelled &&
        currentVideo.paused &&
        !currentVideo.ended
      ) {
        void startDesktopVideo(
          currentVideo
        );
      }
    }, 500);

  return () => {
    cancelled = true;

    window.clearTimeout(
      retryTimeout
    );
  };
}, [deviceMode]);

  /*
   * Evita que "Preparando experiencia"
   * permanezca de forma indefinida.
   */
  useEffect(() => {
    const fallback =
      window.setTimeout(() => {
        setVideoPrepared(true);
      }, 1200);

    return () => {
      window.clearTimeout(
        fallback
      );
    };
  }, []);

  async function startExperience() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    setMuted(true);

    if (video.ended) {
      video.currentTime = 0;
    }

    try {
      await video.play();

      setVideoPrepared(true);
      setExperienceStarted(true);
      setVideoPlaying(true);
      setVideoEnded(false);
      setAutoplayBlocked(false);
    } catch (error) {
      console.error(
        "No se pudo iniciar la experiencia:",
        error
      );

      setVideoPrepared(true);
      setVideoPlaying(false);
      setAutoplayBlocked(true);
    }
  }

  /*
   * Esta es la única acción que
   * regresa el video al segundo cero.
   */
  async function replayVideo() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = 0;

    try {
      await video.play();

      setExperienceStarted(true);
      setVideoPlaying(true);
      setVideoEnded(false);
      setAutoplayBlocked(false);
    } catch (error) {
      console.error(
        "No se pudo reproducir nuevamente:",
        error
      );
    }
  }

  /*
   * Cambiar el sonido no ejecuta play()
   * y tampoco reinicia el video.
   */
  function toggleSound() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    const nextMuted =
      !video.muted;

    video.muted =
      nextMuted;

    setMuted(
      nextMuted
    );
  }

  const showPreparingScreen =
    deviceMode === null ||
    !videoPrepared;

  const showStartScreen =
    videoPrepared &&
    !experienceStarted &&
    (
      deviceMode ===
        "mobile" ||
      autoplayBlocked
    );

  return (
    <section
      className={
        styles.hero
      }
      id="inicio"
    >
      <video
        ref={videoRef}
        className={
          styles.heroVideo
        }
        muted={muted}
        playsInline
        preload="auto"
        disablePictureInPicture
        onLoadedMetadata={() => {
          setVideoPrepared(true);
        }}
        onLoadedData={() => {
          setVideoPrepared(true);
        }}
        onCanPlay={() => {
          setVideoPrepared(true);
        }}
        onCanPlayThrough={() => {
          setVideoPrepared(true);
        }}
        onPlaying={() => {
          setVideoPrepared(true);
          setExperienceStarted(true);
          setVideoPlaying(true);
          setVideoEnded(false);
          setAutoplayBlocked(false);
        }}
        onPause={() => {
          setVideoPlaying(false);
        }}
        onEnded={() => {
          setVideoPlaying(false);
          setVideoEnded(true);
        }}
        onError={(event) => {
          console.error(
            "Error al cargar el video:",
            event
          );

          setVideoPrepared(true);
          setAutoplayBlocked(true);
        }}
      >
        <source
          src="/media/video1.mp4"
          type="video/mp4"
        />

        Tu navegador no soporta
        la reproducción de video.
      </video>

      {showPreparingScreen && (
        <div
          className={
            styles.introScreen
          }
          aria-live="polite"
        >
          <div
            className={
              styles.introLogoWrap
            }
          >
            <img
              src="/images/logo-home-run.png"
              alt="Home Run Rewards"
              className={
                styles.introLogo
              }
            />

            <div
              className={
                styles.introLoader
              }
              aria-hidden="true"
            />

            <p>
              Preparando experiencia
            </p>
          </div>
        </div>
      )}

      {showStartScreen && (
        <button
          type="button"
          className={
            styles.introScreen
          }
          onClick={
            startExperience
          }
          aria-label="Iniciar experiencia"
        >
          <div
            className={
              styles.introLogoWrap
            }
          >
            <img
              src="/images/logo-home-run.png"
              alt="Home Run Rewards"
              className={
                styles.introLogo
              }
            />

            <span
              className={
                styles.startPrompt
              }
            >
              <Play />

              Iniciar experiencia
            </span>
          </div>
        </button>
      )}

      {experienceStarted && (
        <div
          className={
            styles.heroVideoControls
          }
        >
          <button
            type="button"
            className={
              styles.replayButton
            }
            onClick={
              replayVideo
            }
            aria-label="Reproducir nuevamente"
            title="Reproducir nuevamente"
          >
            <RotateCcw />

            <span>
              Reproducir nuevamente
            </span>
          </button>

          <button
            type="button"
            className={
              styles.soundButton
            }
            onClick={
              toggleSound
            }
            aria-label={
              muted
                ? "Activar sonido"
                : "Silenciar video"
            }
            title={
              muted
                ? "Activar sonido"
                : "Silenciar video"
            }
          >
            {muted ? (
              <VolumeX />
            ) : (
              <Volume2 />
            )}

            <span>
              {muted
                ? "Activar sonido"
                : "Silenciar"}
            </span>
          </button>
        </div>
      )}

      {videoEnded && (
        <div
          className={
            styles.endedIndicator
          }
        >
          <span>
            Experiencia finalizada
          </span>
        </div>
      )}
    </section>
  );
}