import styles from "./BaseballScene.module.css";

export default function BaseballScene() {
  return (
    <div
      className={styles.scene}
      aria-label="Pelota de béisbol con aura dorada"
    >
      <div className={styles.auraPrimary} />
      <div className={styles.auraSecondary} />
      <div className={styles.ringOne} />
      <div className={styles.ringTwo} />

      <div className={styles.ball}>
        <span
          className={`${styles.seam} ${styles.seamOne}`}
        />

        <span
          className={`${styles.seam} ${styles.seamTwo}`}
        />

        <span
          className={`${styles.seamShadow} ${styles.seamShadowOne}`}
        />

        <span
          className={`${styles.seamShadow} ${styles.seamShadowTwo}`}
        />
      </div>
    </div>
  );
}