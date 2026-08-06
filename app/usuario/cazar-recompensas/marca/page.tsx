"use client";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ReceiptText, Store } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "../CazarRecompensas.module.css";
import { readActiveDynamicCampaigns, type BrandCampaign, DYNAMIC_CAMPAIGNS_EVENT } from "@/lib/campaignDynamics";
export default function Page(){
 const [items,setItems]=useState<BrandCampaign[]>([]);
 useEffect(()=>{const update=async()=>setItems(await readActiveDynamicCampaigns("brand") as BrandCampaign[]);void update();addEventListener(DYNAMIC_CAMPAIGNS_EVENT,update);return()=>removeEventListener(DYNAMIC_CAMPAIGNS_EVENT,update)},[]);
 return <main className={styles.mobileStage}><div className={styles.topBar}><Link href="/usuario/cazar-recompensas" className={styles.backButton}><ArrowLeft/></Link><span>Visita a marca</span></div>
 <section className={styles.selectorIntro}><div className={styles.eyebrow}><ReceiptText/>Campañas activas</div><h1>Elige dónde quieres participar</h1><p>Selecciona una campaña y sube tu ticket para validar la compra.</p></section>
 {!items.length?<section className={styles.emptyCard}><Store/><h2>No hay campañas activas</h2><p>Regresa más tarde para encontrar una nueva dinámica.</p><Link href="/usuario/cazar-recompensas">Volver</Link></section>:
 <section className={styles.campaignCarousel}>{items.map(c=><Link key={c.id} href={`/usuario/cazar-recompensas/marca/ticket?campaign=${encodeURIComponent(c.id)}`} className={styles.campaignCard} style={c.coverUrl ? { backgroundImage: `linear-gradient(90deg,rgba(8,9,12,.92),rgba(8,9,12,.76)),url(${c.coverUrl})`, backgroundSize:"cover", backgroundPosition:"center" } : undefined}><div className={styles.campaignIcon}><Store/></div><div className={styles.campaignBody}><span>{c.brandName}</span><h2>{c.name}</h2><p>{c.description}</p></div><ChevronRight/></Link>)}</section>}
 </main>;
}
