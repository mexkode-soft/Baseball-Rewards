"use client";

import styles from "./PortalHome.module.css";

interface PortalHomeProps {
  role: "admin" | "usuario";
}

export default function PortalHome({ role }: PortalHomeProps) {
  return (
    <main className={styles.home}>
      <div className={styles.aura} />
      <img src="/images/logo-home-run.png" alt="Home Run Rewards" className={styles.logo} />
      <span>{role === "admin" ? "Panel administrativo" : "Panel de usuario"}</span>
      <h1>Home Run Rewards</h1>
      <p>
        {role === "admin"
          ? "Administra campañas, preguntas, recompensas y experiencias desde un solo lugar."
          : "Descubre campañas, suma puntos y desbloquea nuevas recompensas."}
      </p>
    </main>
  );
}
