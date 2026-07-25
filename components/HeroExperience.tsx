"use client";

import {
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  useRef,
  useState,
} from "react";

import styles from "./HeroExperience.module.css";

export default function HeroExperience() {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const [muted, setMuted] =
    useState(true);

  function toggleSound() {
    const nextMutedState = !muted;

    setMuted(nextMutedState);

    if (!videoRef.current) {
      return;
    }

    videoRef.current.muted =
      nextMutedState;

    videoRef.current
      .play()
      .catch(() => {
        /*
         * Algunos navegadores pueden bloquear
         * la reproducción automática hasta que
         * el usuario interactúe con la página.
         */
      });
  }

  function replayVideo() {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.currentTime = 0;
    videoRef.current.muted = muted;

    videoRef.current
      .play()
      .catch(() => {
        /*
         * Algunos navegadores pueden bloquear
         * la reproducción automática hasta que
         * el usuario interactúe con la página.
         */
      });
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
          aria-label="Reproducir nuevamente el video"
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
          onClick={toggleSound}
          aria-label={
            muted
              ? "Activar sonido del video"
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