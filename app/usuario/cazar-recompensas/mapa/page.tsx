"use client";

import { ArrowLeft, ChevronRight, Gift, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../CazarRecompensas.module.css";
import {
  DYNAMIC_CAMPAIGNS_EVENT,
  readActiveDynamicCampaigns,
  type MapCampaign,
} from "@/lib/campaignDynamics";

export default function MapCampaignPage() {
  const [items, setItems] = useState<MapCampaign[]>([]);

  useEffect(() => {
    const update = async () => setItems(await readActiveDynamicCampaigns("map") as MapCampaign[]);
    void update();
    window.addEventListener(DYNAMIC_CAMPAIGNS_EVENT, update);
    return () => window.removeEventListener(DYNAMIC_CAMPAIGNS_EVENT, update);
  }, []);

  return (
    <main className={styles.mobileStage}>
      <div className={styles.topBar}>
        <Link href="/usuario/cazar-recompensas" className={styles.backButton}><ArrowLeft /></Link>
        <span>Recompensa en mapa</span>
      </div>

      <section className={styles.selectorIntro}>
        <div className={styles.eyebrow}><MapPin />Campañas activas</div>
        <h1>Elige una campaña</h1>
        <p>Cada campaña puede tener varios premios en ubicaciones distintas.</p>
      </section>

      <section className={styles.campaignCarousel}>
        {items.map((campaign) => {
          const totalUnits = campaign.locations.reduce((sum, location) => sum + Math.max(0, location.availableUnits), 0);
          return (
            <article key={campaign.id} className={`${styles.campaignCard} ${styles.mapCampaignCard}`}>
              <div className={styles.campaignIcon}><MapPin /></div>
              <div className={styles.campaignBody}>
                <span>{campaign.sponsor}</span>
                <h2>{campaign.name}</h2>
                <p>{campaign.description}</p>
                <div className={styles.campaignMeta}>
                  <div><MapPin /><span>{campaign.locations.length} ubicaciones</span></div>
                  <div><Gift /><span>{totalUnits} premios disponibles</span></div>
                </div>

                <div className={styles.locationChoiceList}>
                  {campaign.locations.map((location, index) => (
                    <Link
                      key={location.id}
                      href={`/usuario/cazar-recompensas/mapa/jugar?campaign=${encodeURIComponent(campaign.id)}&location=${encodeURIComponent(location.id)}`}
                      className={styles.locationChoice}
                    >
                      <div><strong>{index + 1}. {location.name}</strong><span>{location.reward} · {location.availableUnits} disponible{location.availableUnits === 1 ? "" : "s"}</span></div>
                      <ChevronRight />
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {!items.length && <section className={styles.emptyCard}><MapPin /><h2>No hay campañas activas</h2><p>El administrador debe publicar una campaña de mapa.</p></section>}
    </main>
  );
}
