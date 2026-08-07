"use client";

import { CalendarDays, Edit3, Eye, PauseCircle, PlayCircle, Plus, QrCode, Store, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { deleteCampaign, readCampaignAdminItems, updateCampaignStatus, type CampaignAdminItem } from "@/lib/campaignAdmin";
import styles from "./Campanas.module.css";

const labels = { qr: "Búsqueda QR", map: "Recompensa en mapa", brand: "Visita a marca" } as const;
const statusLabels: Record<CampaignAdminItem["status"], string> = { draft: "Borrador", scheduled: "Programada", active: "Activa", paused: "Pausada", finished: "Finalizada" };
type StatusFilter = "all" | CampaignAdminItem["status"];
function TypeIcon({ type }: { type: CampaignAdminItem["type"] }) { return type === "qr" ? <QrCode/> : type === "map" ? <MapPin/> : <Store/>; }
function date(value: string) { return value ? new Intl.DateTimeFormat("es-MX", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(value)) : "Sin fecha"; }

export default function CampaignsPage() {
  const [items,setItems] = useState<CampaignAdminItem[]>([]);
  const [message,setMessage] = useState("");
  const [statusFilter,setStatusFilter] = useState<StatusFilter>("active");
  async function load(){ setItems(await readCampaignAdminItems()); }
  useEffect(()=>{ void load().catch((error)=>setMessage(error instanceof Error?error.message:"No se pudieron cargar las campañas.")); },[]);
  async function remove(id:string){ if(!window.confirm("¿Eliminar esta campaña y todos sus QR, ubicaciones y participaciones?"))return; try{await deleteCampaign(id);await load();setMessage("Campaña eliminada.");}catch(error){setMessage(error instanceof Error?error.message:"No se pudo eliminar.");}}
  async function toggle(item:CampaignAdminItem){ try{await updateCampaignStatus(item.id,item.status==="active"?"paused":"active");await load();}catch(error){setMessage(error instanceof Error?error.message:"No se pudo actualizar.");}}
  const filteredItems = useMemo(() => statusFilter === "all" ? items : items.filter((item) => item.status === statusFilter), [items, statusFilter]);
  return <>
    <header className={styles.header}><span>Administración</span><h1>Mis campañas</h1><p>Consulta, edita, pausa o elimina las campañas creadas.</p><Link href="/admin/crear-campana"><Plus/>Crear campaña</Link></header>
    {message&&<div className={styles.message}>{message}</div>}
    <section className={styles.filters} aria-label="Filtrar campañas por estado">
      {([ ["active","Activas"], ["draft","Borrador"], ["finished","Finalizadas"], ["scheduled","Programadas"], ["paused","Pausadas"], ["all","Todas"] ] as Array<[StatusFilter,string]>).map(([value,label]) => <button key={value} type="button" className={statusFilter===value?styles.filterActive:""} onClick={()=>setStatusFilter(value)}>{label}</button>)}
    </section>
    <section className={styles.grid}>{filteredItems.map((item)=><article key={item.id}>
      <div className={styles.cover}>{item.coverUrl?<img src={item.coverUrl} alt=""/>:<TypeIcon type={item.type}/>}<span>{labels[item.type]}</span></div>
      <div className={styles.body}><div className={styles.status} data-status={item.status}>{statusLabels[item.status]}</div><h2>{item.name}</h2><p>{item.description||"Sin descripción"}</p><div className={styles.dates}><CalendarDays/>{date(item.startsAt)} — {date(item.endsAt)}</div></div>
      <div className={styles.actions}><Link href={`/admin/crear-campana?type=${item.type}&id=${item.id}`}><Edit3/>Editar</Link><button type="button" onClick={()=>void toggle(item)}>{item.status==="active"?<PauseCircle/>:<PlayCircle/>}{item.status==="active"?"Pausar":"Activar"}</button><button type="button" className={styles.delete} onClick={()=>void remove(item.id)}><Trash2/>Eliminar</button></div>
    </article>)}</section>
    {!filteredItems.length&&<section className={styles.empty}><Eye/><h2>No hay campañas en este estado</h2><p>Cambia el filtro o crea una nueva campaña.</p></section>}
  </>;
}
