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
    showIntro,
    setShowIntro,
  ] = useState(true);

  const [
    introLeaving,
    setIntroLeaving,
  ] = useState(false);

  const [
    autoplayBlocked,
    setAutoplayBlocked,
  ] = useState(false);

  const startVideo =
    useCallback(async () => {
      const videoElement =
        videoRef.current;

      if (!videoElement) {
        return;
      }

      videoElement.muted = true;
      videoElement.defaultMuted = true;
      videoElement.playsInline = true;

      try {
        await videoElement.play();

        setAutoplayBlocked(false);
      } catch (error) {
        console.warn(
          "El navegador bloqueó el video automático:",
          error
        );

        setAutoplayBlocked(true);
      }
    }, []);

  useEffect(() => {
    /*
     * Intentamos reproducir el video
     * mientras todavía está visible
     * la pantalla de introducción.
     */
    void startVideo();

    const introTimer =
      window.setTimeout(() => {
        setIntroLeaving(true);

        /*
         * Volvemos a solicitar la
         * reproducción justo antes
         * de retirar la portada.
         */
        void startVideo();
      }, 2000);

    const removeIntroTimer =
      window.setTimeout(() => {
        setShowIntro(false);

        void startVideo();
      }, 2550);

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
        introTimer
      );

      window.clearTimeout(
        removeIntroTimer
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

  async function replayVideo() {
    const videoElement =
      videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.currentTime = 0;

    try {
      await videoElement.play();

      setAutoplayBlocked(false);
    } catch (error) {
      console.error(
        "No se pudo reproducir el video:",
        error
      );

      setAutoplayBlocked(true);
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

    setMuted(nextMutedState);

    videoElement.muted =
      nextMutedState;

    try {
      await videoElement.play();

      setAutoplayBlocked(false);
    } catch (error) {
      console.error(
        "No se pudo continuar el video:",
        error
      );
    }
  }

  async function playManually() {
    const videoElement =
      videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.muted = true;

    setMuted(true);

    try {
      await videoElement.play();

      setAutoplayBlocked(false);
    } catch (error) {
      console.error(
        "No se pudo iniciar el video:",
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
        className={styles.heroVideo}
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        poster="/images/logo-home-run.png"
        disablePictureInPicture
        loop
      >
        <source
          src="/media/video1.mp4"
          type="video/mp4"
        />

        Tu navegador no soporta
        la reproducción de video.
      </video>

      {showIntro && (
        <div
          className={`${styles.introScreen} ${
            introLeaving
              ? styles.introScreenLeaving
              : ""
          }`}
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
                styles.introLoader
              }
            />

            <p>
              Preparando la experiencia
            </p>
          </div>
        </div>
      )}

      {!showIntro &&
        autoplayBlocked && (
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

            Reproducir video
          </button>
        )}

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
    </section>
  );
}