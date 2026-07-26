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

type IntroStage =
  | "checking"
  | "loading"
  | "ready"
  | "hidden";

export default function HeroExperience() {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const initializedRef =
    useRef(false);

  const [muted, setMuted] =
    useState(true);

  const [
    introStage,
    setIntroStage,
  ] = useState<IntroStage>(
    "checking"
  );

  const [
    videoPlaying,
    setVideoPlaying,
  ] = useState(false);

  const startMutedVideo =
    useCallback(async () => {
      const videoElement =
        videoRef.current;

      if (!videoElement) {
        return false;
      }

      videoElement.muted = true;
      videoElement.defaultMuted =
        true;
      videoElement.playsInline =
        true;

      setMuted(true);

      try {
        await videoElement.play();

        setVideoPlaying(true);
        setIntroStage("hidden");

        return true;
      } catch (error) {
        console.warn(
          "El navegador bloqueó el autoplay:",
          error
        );

        setVideoPlaying(false);

        return false;
      }
    }, []);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    let cancelled = false;

    let introTimer:
      | number
      | undefined;

    async function initializeVideo() {
      /*
       * En computadora y navegadores
       * compatibles intentará reproducir
       * automáticamente.
       */
      const autoplayWorked =
        await startMutedVideo();

      if (
        cancelled ||
        autoplayWorked
      ) {
        return;
      }

      /*
       * Solamente cuando el autoplay
       * falla mostramos la introducción.
       */
      setIntroStage("loading");

      introTimer =
        window.setTimeout(() => {
          if (!cancelled) {
            setIntroStage(
              "ready"
            );
          }
        }, 2000);
    }

    void initializeVideo();

    return () => {
      cancelled = true;

      if (
        introTimer !==
        undefined
      ) {
        window.clearTimeout(
          introTimer
        );
      }
    };
  }, [startMutedVideo]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      const videoElement =
        videoRef.current;

      /*
       * Solo reanudamos cuando la
       * experiencia ya había iniciado.
       * No modificamos la portada.
       */
      if (
        !videoElement ||
        introStage !== "hidden" ||
        !videoElement.paused
      ) {
        return;
      }

      void videoElement
        .play()
        .catch((error) => {
          console.warn(
            "No se pudo reanudar el video:",
            error
          );
        });
    }

    function handlePageShow() {
      const videoElement =
        videoRef.current;

      if (
        !videoElement ||
        introStage !== "hidden" ||
        !videoElement.paused
      ) {
        return;
      }

      void videoElement
        .play()
        .catch((error) => {
          console.warn(
            "No se pudo reanudar el video:",
            error
          );
        });
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
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow
      );
    };
  }, [introStage]);

  async function startExperience() {
    const videoElement =
      videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.muted = true;
    videoElement.defaultMuted =
      true;
    videoElement.playsInline =
      true;

    setMuted(true);

    try {
      /*
       * Este play ocurre directamente
       * desde el toque del usuario.
       */
      await videoElement.play();

      setVideoPlaying(true);
      setIntroStage("hidden");
    } catch (error) {
      console.error(
        "No se pudo iniciar el video:",
        error
      );

      setVideoPlaying(false);
      setIntroStage("ready");
    }
  }

  async function replayVideo() {
    const videoElement =
      videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.currentTime = 0;

    try {
      await videoElement.play();

      setVideoPlaying(true);
      setIntroStage("hidden");
    } catch (error) {
      console.error(
        "No se pudo reproducir nuevamente:",
        error
      );

      setVideoPlaying(false);
      setIntroStage("ready");
    }
  }

  async function toggleSound() {
    const videoElement =
      videoRef.current;

    if (!videoElement) {
      return;
    }

    const nextMutedState =
      !muted;

    videoElement.muted =
      nextMutedState;

    setMuted(
      nextMutedState
    );

    try {
      await videoElement.play();

      setVideoPlaying(true);
    } catch (error) {
      console.error(
        "No se pudo continuar el video:",
        error
      );
    }
  }

  return (
    <section
      className={styles.hero}
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
        poster="/images/logo-home-run.png"
        onPlaying={() => {
          setVideoPlaying(true);
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

      {(introStage ===
        "loading" ||
        introStage ===
          "ready") && (
        <button
          type="button"
          className={
            styles.introScreen
          }
          onClick={
            introStage ===
            "ready"
              ? startExperience
              : undefined
          }
          disabled={
            introStage ===
            "loading"
          }
          aria-label={
            introStage ===
            "ready"
              ? "Iniciar experiencia"
              : "Preparando experiencia"
          }
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

            {introStage ===
            "loading" ? (
              <>
                <span
                  className={
                    styles.introLoader
                  }
                />

                <p>
                  Preparando la
                  experiencia
                </p>
              </>
            ) : (
              <span
                className={
                  styles.startPrompt
                }
              >
                <Play />

                Toca para comenzar
              </span>
            )}
          </div>
        </button>
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