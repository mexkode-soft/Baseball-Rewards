"use client";

import { ArrowLeft, CalendarDays, ChevronRight, Gift, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../CazarRecompensas.module.css";
import { DYNAMIC_CAMPAIGNS_EVENT, readActiveDynamicCampaigns, type MapCampaign } from "@/lib/campaignDynamics";

function formatDate(value?: string) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(new Date(value));
}

export default function MapCampaignPage() {
  const [items, setItems] = useState<MapCampaign[]>([]);
  useEffect(() => {
    const update = async () => setItems(await readActiveDynamicCampaigns("map") as MapCampaign[]);
    void update();
    window.addEventListener(DYNAMIC_CAMPAIGNS_EVENT, update);
    return () => window.removeEventListener(DYNAMIC_CAMPAIGNS_EVENT, update);
  }, []);

  return <main className={styles.mobileStage}>
    <div className={styles.topBar}><Link href="/usuario/cazar-recompensas" className={styles.backButton} aria-label="Regresar"><ArrowLeft /></Link><span>Recompensa en mapa</span></div>
    <section className={styles.selectorIntro}><div className={styles.eyebrow}><MapPin />Campañas activas</div><h1>Elige dónde quieres participar</h1><p>Selecciona una campaña y después elige la ubicación del premio.</p></section>
    {!items.length ? <section className={styles.emptyCard}><MapPin /><h2>No hay campañas activas</h2><p>Regresa más tarde para encontrar una nueva dinámica.</p><Link href="/usuario/cazar-recompensas">Volver</Link></section> :
    <section className={styles.campaignCarousel}>{items.map(campaign => {
      const totalUnits=campaign.locations.reduce((sum,location)=>sum+Math.max(0,location.availableUnits),0);
      return <Link key={campaign.id} href={`/usuario/cazar-recompensas/mapa/ubicaciones?campaign=${encodeURIComponent(campaign.id)}`} className={styles.campaignCard} style={campaign.coverUrl ? { backgroundImage: `linear-gradient(90deg,rgba(8,9,12,.92),rgba(8,9,12,.76)),url(${campaign.coverUrl})`, backgroundSize:"cover", backgroundPosition:"center" } : undefined}>
        <div className={styles.campaignIcon}><MapPin /></div>
        <div className={styles.campaignBody}><span>{campaign.sponsor}</span><h2>{campaign.name}</h2><p>{campaign.description}</p>
          <div className={styles.campaignMeta}><div><MapPin /><span>{campaign.locations.length} ubicaciones</span></div><div><Gift /><span>{totalUnits} premios disponibles</span></div></div>
        </div><ChevronRight />
      </Link>})}</section>}
  </main>;
}
