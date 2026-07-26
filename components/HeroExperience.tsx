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

export default function HeroExperience() {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const [muted, setMuted] =
    useState(true);

  const [
    videoReady,
    setVideoReady,
  ] = useState(false);

  const [
    videoPlaying,
    setVideoPlaying,
  ] = useState(false);

  const [
    autoplayBlocked,
    setAutoplayBlocked,
  ] = useState(false);

  const startVideo =
    useCallback(async () => {
      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;

      try {
        await video.play();

        setVideoPlaying(true);
        setVideoReady(true);
        setAutoplayBlocked(false);
      } catch (error) {
        console.warn(
          "El navegador bloqueó la reproducción automática:",
          error
        );

        setVideoPlaying(false);
        setVideoReady(true);
        setAutoplayBlocked(true);
      }
    }, []);

  useEffect(() => {
    void startVideo();

    /*
     * Evita que la pantalla de carga
     * permanezca demasiado tiempo.
     */
    const loadingFallback =
      window.setTimeout(() => {
        setVideoReady(true);
      }, 900);

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void startVideo();
      }
    }

    function handlePageShow() {
      void startVideo();
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "pageshow",
      handlePageShow
    );

    return () => {
      window.clearTimeout(
        loadingFallback
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow
      );
    };
  }, [startVideo]);

  async function playManually() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    video.muted = true;

    setMuted(true);

    try {
      await video.play();

      setVideoReady(true);
      setVideoPlaying(true);
      setAutoplayBlocked(false);
    } catch (error) {
      console.error(
        "No se pudo iniciar el video:",
        error
      );
    }
  }

  async function replayVideo() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = 0;

    try {
      await video.play();

      setVideoPlaying(true);
      setAutoplayBlocked(false);
    } catch (error) {
      console.error(
        "No se pudo reproducir nuevamente:",
        error
      );

      setAutoplayBlocked(true);
    }
  }

  async function toggleSound() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    const nextMutedState =
      !muted;

    video.muted =
      nextMutedState;

    setMuted(
      nextMutedState
    );

    try {
      await video.play();

      setVideoPlaying(true);
      setAutoplayBlocked(false);
    } catch (error) {
      console.error(
        "No se pudo continuar el video:",
        error
      );
    }
  }

  /*
   * La pantalla de carga desaparece
   * en cuanto existe un primer frame
   * disponible o pasan 900 ms.
   */
  const showLoading =
    !videoReady;

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
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        loop
        disablePictureInPicture
        onLoadedMetadata={() => {
          setVideoReady(true);
        }}
        onLoadedData={() => {
          setVideoReady(true);

          void startVideo();
        }}
        onCanPlay={() => {
          setVideoReady(true);

          void startVideo();
        }}
        onPlaying={() => {
          setVideoReady(true);
          setVideoPlaying(true);
          setAutoplayBlocked(false);
        }}
        onWaiting={() => {
          /*
           * No volvemos a mostrar
           * la pantalla de carga.
           */
          setVideoPlaying(false);
        }}
        onStalled={() => {
          setVideoPlaying(false);
        }}
        onPause={() => {
          setVideoPlaying(false);
        }}
      >
        <source
          src="/media/video1.mp4"
          type="video/mp4"
        />

        Tu navegador no soporta
        la reproducción de video.
      </video>

      {showLoading && (
        <div
          className={
            styles.loadingScreen
          }
          aria-live="polite"
        >
          <div
            className={
              styles.loadingContent
            }
          >
            <img
              src="/images/logo-home-run.png"
              alt="Home Run Rewards"
              className={
                styles.loadingLogo
              }
            />

            <span
              className={
                styles.loadingSpinner
              }
              aria-hidden="true"
            />

            <p>
              Cargando experiencia
            </p>
          </div>
        </div>
      )}

      {autoplayBlocked &&
        !videoPlaying &&
        !showLoading && (
          <div
            className={
              styles.manualPlayOverlay
            }
          >
            <button
              type="button"
              className={
                styles.manualPlayButton
              }
              onClick={
                playManually
              }
            >
              <Play />

              Toca para comenzar
            </button>
          </div>
        )}

      {videoPlaying && (
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
    </section>
  );
}