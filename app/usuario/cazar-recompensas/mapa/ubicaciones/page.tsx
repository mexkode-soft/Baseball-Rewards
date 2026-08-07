"use client";
import { ArrowLeft, ChevronRight, Gift, MapPin } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "../../CazarRecompensas.module.css";
import { readActiveDynamicCampaigns, type MapCampaign } from "@/lib/campaignDynamics";

export default function UbicacionesPage(){
 const params=useSearchParams(); const campaignId=params.get("campaign")??""; const [campaign,setCampaign]=useState<MapCampaign|null>(null);
 useEffect(()=>{void readActiveDynamicCampaigns("map").then(items=>setCampaign((items as MapCampaign[]).find(item=>item.id===campaignId)??null));},[campaignId]);
 return <main className={styles.mobileStage}><div className={styles.topBar}><Link href="/usuario/cazar-recompensas/mapa" className={styles.backButton}><ArrowLeft/></Link><span>Elige una ubicación</span></div>
 <section className={styles.selectorIntro}><div className={styles.eyebrow}><MapPin/>Ubicaciones disponibles</div><h1>{campaign?.name??"Selecciona el premio"}</h1><p>Elige la ubicación en la que deseas participar.</p></section>
 {!campaign?<section className={styles.emptyCard}><MapPin/><h2>Campaña no disponible</h2><p>Regresa al listado y selecciona otra campaña.</p><Link href="/usuario/cazar-recompensas/mapa">Volver</Link></section>:
 <section className={styles.campaignCarousel}>{campaign.locations.filter((location)=>location.availableUnits>0).map((location,index)=><Link key={location.id} href={`/usuario/cazar-recompensas/mapa/jugar?campaign=${encodeURIComponent(campaign.id)}&location=${encodeURIComponent(location.id)}`} className={styles.campaignCard}><div className={styles.campaignIcon}><MapPin/></div><div className={styles.campaignBody}><span>Ubicación {index+1}</span><h2>{location.name}</h2><p>{location.reward}</p><div className={styles.campaignMeta}><div><Gift/><span>{location.availableUnits} disponible{location.availableUnits===1?"":"s"}</span></div></div></div><ChevronRight/></Link>)}</section>}
 </main>;
}
