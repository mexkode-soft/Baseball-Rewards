"use client";

import {
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

      try {
        await videoElement.play();

        setAutoplayBlocked(false);
      } catch (error) {
        console.warn(
          "El navegador bloqueó el autoplay:",
          error
        );

        setAutoplayBlocked(true);
      }
    }, []);

  useEffect(() => {
    const videoElement =
      videoRef.current;

    if (!videoElement) {
      return;
    }

    /*
     * El video debe iniciar silenciado
     * para que el navegador móvil permita
     * la reproducción automática.
     */
    videoElement.muted = true;
    videoElement.defaultMuted = true;
    videoElement.playsInline = true;

    void startVideo();

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

    await startVideo();
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

    /*
     * Cuando el usuario activa el sonido,
     * defaultMuted debe permanecer en true
     * para no afectar la política inicial
     * de autoplay.
     */
    if (nextMutedState) {
      videoElement.defaultMuted = true;
    }

    await startVideo();
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
        muted
        playsInline
        preload="auto"
        poster="/images/logo-home-run.png"
        disablePictureInPicture
      >
        <source
          src="/media/video1.mp4"
          type="video/mp4"
        />

        Tu navegador no soporta
        la reproducción de video.
      </video>

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
          onClick={replayVideo}
          aria-label={
            autoplayBlocked
              ? "Reproducir video"
              : "Reproducir nuevamente"
          }
          title={
            autoplayBlocked
              ? "Reproducir video"
              : "Reproducir nuevamente"
          }
        >
          <RotateCcw />

          <span>
            {autoplayBlocked
              ? "Reproducir video"
              : "Reproducir nuevamente"}
          </span>
        </button>

        <button
          type="button"
          className={
            styles.soundButton
          }
          onClick={toggleSound}
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