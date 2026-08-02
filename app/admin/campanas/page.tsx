"use client";

import { CalendarDays, Edit3, Eye, PauseCircle, PlayCircle, Plus, QrCode, Store, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteCampaign, readCampaignAdminItems, updateCampaignStatus, type CampaignAdminItem } from "@/lib/campaignAdmin";
import styles from "./Campanas.module.css";

const labels = { qr: "Búsqueda QR", map: "Recompensa en mapa", brand: "Visita a marca" } as const;
function TypeIcon({ type }: { type: CampaignAdminItem["type"] }) { return type === "qr" ? <QrCode/> : type === "map" ? <MapPin/> : <Store/>; }
function date(value: string) { return value ? new Intl.DateTimeFormat("es-MX", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(value)) : "Sin fecha"; }

export default function CampaignsPage() {
  const [items,setItems] = useState<CampaignAdminItem[]>([]);
  const [message,setMessage] = useState("");
  async function load(){ setItems(await readCampaignAdminItems()); }
  useEffect(()=>{ void load().catch((error)=>setMessage(error instanceof Error?error.message:"No se pudieron cargar las campañas.")); },[]);
  async function remove(id:string){ if(!window.confirm("¿Eliminar esta campaña y todos sus QR, ubicaciones y participaciones?"))return; try{await deleteCampaign(id);await load();setMessage("Campaña eliminada.");}catch(error){setMessage(error instanceof Error?error.message:"No se pudo eliminar.");}}
  async function toggle(item:CampaignAdminItem){ try{await updateCampaignStatus(item.id,item.status==="active"?"paused":"active");await load();}catch(error){setMessage(error instanceof Error?error.message:"No se pudo actualizar.");}}
  return <>
    <header className={styles.header}><span>Administración</span><h1>Mis campañas</h1><p>Consulta, edita, pausa o elimina las campañas creadas.</p><Link href="/admin/crear-campana"><Plus/>Crear campaña</Link></header>
    {message&&<div className={styles.message}>{message}</div>}
    <section className={styles.grid}>{items.map((item)=><article key={item.id}>
      <div className={styles.cover}>{item.coverUrl?<img src={item.coverUrl} alt=""/>:<TypeIcon type={item.type}/>}<span>{labels[item.type]}</span></div>
      <div className={styles.body}><div className={styles.status} data-status={item.status}>{item.status}</div><h2>{item.name}</h2><p>{item.description||"Sin descripción"}</p><div className={styles.dates}><CalendarDays/>{date(item.startsAt)} — {date(item.endsAt)}</div></div>
      <div className={styles.actions}><Link href={`/admin/crear-campana?type=${item.type}&id=${item.id}`}><Edit3/>Editar</Link><button type="button" onClick={()=>void toggle(item)}>{item.status==="active"?<PauseCircle/>:<PlayCircle/>}{item.status==="active"?"Pausar":"Activar"}</button><button type="button" className={styles.delete} onClick={()=>void remove(item.id)}><Trash2/>Eliminar</button></div>
    </article>)}</section>
    {!items.length&&<section className={styles.empty}><Eye/><h2>Aún no hay campañas</h2><p>Crea la primera campaña para comenzar.</p></section>}
  </>;
}
