import {
  MapPinned,
  Sparkles,
  Trophy,
} from "lucide-react";

import styles from "./AboutSection.module.css";

export default function AboutSection() {
  return (
    <section
      id="quienes-somos"
      className={styles.aboutSection}
    >
      <div className={styles.decorativeCircleTop} />
      <div className={styles.decorativeCircleBottom} />

      <div className={styles.aboutContainer}>
        <span className={styles.eyebrow}>
          ¿Quiénes somos?
        </span>

        <h2 className={styles.aboutTitle}>
          <span className={styles.goldTitle}>
            Campañas interactivas
          </span>

          <span className={styles.whiteTitle}>
            para verdaderos fans
            <br />
            del baseball.
          </span>
        </h2>

        <div className={styles.goldDivider} />

        <div className={styles.description}>
          <p><strong>Home Run Rewards</strong> es una plataforma de fidelización para ligas, equipos deportivos, patrocinadores y marcas.</p>
          <p>Integra campañas interactivas, promociones, recompensas, rankings, experiencias en tiempo real y próximamente Baseball Fantasy dentro de un mismo ecosistema digital.</p>
        </div>

        <div className={styles.logoArea}>
          <div className={styles.logoCircle}>
            <img
              src="/images/logo-home-run.png"
              alt="Home Run Rewards"
              className={styles.aboutLogo}
            />
          </div>
        </div>

        <div className={styles.featureRow}>
          <article className={styles.featureCard}>
            <div className={styles.iconContainer}>
              <MapPinned />
            </div>

            <h3>Explora</h3>

            <p>
              Localiza campañas, experiencias
              y recompensas cerca de ti.
            </p>
          </article>

          <article className={styles.featureCard}>
            <div className={styles.iconContainer}>
              <Sparkles />
            </div>

            <h3>Participa</h3>

            <p>
              Vive dinámicas interactivas creadas
              para acercarte a tus marcas favoritas.
            </p>
          </article>

          <article className={styles.featureCard}>
            <div className={styles.iconContainer}>
              <Trophy />
            </div>

            <h3>Gana</h3>

            <p>
              Consigue premios, suma puntos y sube
              posiciones dentro del ranking.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}