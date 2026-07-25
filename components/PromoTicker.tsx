import {
  Gift,
  Star,
  TicketPercent,
  Trophy,
} from "lucide-react";

import styles from "./PromoTicker.module.css";

const promotions = [
  {
    icon: TicketPercent,
    text: "2x1 en el partido Águilas vs. Tomateros",
  },
  {
    icon: Gift,
    text: "Premios sorpresa durante el encuentro",
  },
  {
    icon: Trophy,
    text: "Participa y sube en el ranking",
  },
  {
    icon: Star,
    text: "Encuentra recompensas cerca del estadio",
  },
];

function PromotionGroup() {
  return (
    <div className={styles.promotionGroup}>
      {promotions.map((promotion) => {
        const Icon = promotion.icon;

        return (
          <div
            key={promotion.text}
            className={styles.promotionItem}
          >
            <Icon />

            <span>
              {promotion.text}
            </span>

            <span
              className={styles.separator}
              aria-hidden="true"
            >
              ⚾
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PromoTicker() {
  return (
    <aside
      className={styles.ticker}
      aria-label="Promociones activas"
    >
      <div className={styles.tickerViewport}>
        <div className={styles.tickerTrack}>
          <PromotionGroup />

          <div aria-hidden="true">
            <PromotionGroup />
          </div>
        </div>
      </div>
    </aside>
  );
}