"use client";

import { CalendarRange, CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { activateSeason, deleteSeason, readSeasons, saveSeason, type Season, type SeasonStatus } from "@/lib/seasons";
import styles from "./Temporadas.module.css";

const emptyForm = { id: "", name: "", startsAt: "", endsAt: "", status: "draft" as SeasonStatus };

export default function SeasonsPage() {
  const [items, setItems] = useState<Season[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);

  async function load() {
    setItems(await readSeasons());
  }

  useEffect(() => { void load().catch((error) => setNotice(error instanceof Error ? error.message : "No se pudieron cargar las temporadas.")); }, []);

  async function save() {
    if (!form.name.trim() || !form.startsAt || !form.endsAt) return setNotice("Completa nombre, inicio y fin de la temporada.");
    if (form.endsAt < form.startsAt) return setNotice("La fecha final no puede ser anterior al inicio.");
    setWorking(true);
    try {
      await saveSeason({ id: form.id || undefined, name: form.name, startsAt: form.startsAt, endsAt: form.endsAt, status: form.status });
      setForm(emptyForm);
      setNotice("Temporada guardada correctamente.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar la temporada.");
    } finally { setWorking(false); }
  }

  async function makeActive(id: string) {
    setWorking(true);
    try { await activateSeason(id); setNotice("La temporada fue activada. El ranking comienza desde cero para esta temporada."); await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo activar la temporada."); }
    finally { setWorking(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar esta temporada? Los movimientos históricos quedarán sin temporada asociada.")) return;
    try { await deleteSeason(id); await load(); setNotice("Temporada eliminada."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo eliminar la temporada."); }
  }

  return <>
    <header className={styles.header}><span>Competencia</span><h1>Temporadas</h1><p>Define el periodo del ranking. Cada temporada inicia su propia clasificación desde cero y conserva el histórico anterior.</p></header>
    <div className={styles.layout}>
      <section className={styles.panel}>
        <div className={styles.heading}><CalendarRange/><div><span>Configuración</span><h2>{form.id ? "Editar temporada" : "Nueva temporada"}</h2></div></div>
        <div className={styles.grid}>
          <label>Nombre<input value={form.name} onChange={(event)=>setForm({...form,name:event.target.value})} placeholder="Ej. Temporada Apertura 2026"/></label>
          <label>Estado<select value={form.status} onChange={(event)=>setForm({...form,status:event.target.value as SeasonStatus})}><option value="draft">Borrador</option><option value="active">Activa</option><option value="closed">Cerrada</option></select></label>
          <label>Inicio<input type="date" value={form.startsAt} onChange={(event)=>setForm({...form,startsAt:event.target.value})}/></label>
          <label>Fin<input type="date" value={form.endsAt} onChange={(event)=>setForm({...form,endsAt:event.target.value})}/></label>
        </div>
        <div className={styles.actions}><button type="button" className={styles.secondary} onClick={()=>setForm(emptyForm)}><Plus/>Nueva</button><button type="button" disabled={working} onClick={()=>void save()}><Save/>Guardar temporada</button></div>
        {notice && <div className={styles.notice}><CheckCircle2/>{notice}</div>}
      </section>
      <section className={styles.panel}>
        <div className={styles.heading}><CalendarRange/><div><span>Histórico</span><h2>Temporadas registradas</h2></div></div>
        <div className={styles.list}>{items.map((season)=><article key={season.id} className={season.status==="active"?styles.active:""}>
          <div><span>{season.status === "active" ? "Temporada activa" : season.status === "closed" ? "Finalizada" : "Borrador"}</span><h3>{season.name}</h3><p>{season.startsAt} — {season.endsAt}</p></div>
          <div className={styles.rowActions}><button type="button" onClick={()=>setForm(season)}>Editar</button>{season.status!=="active"&&<button type="button" onClick={()=>void makeActive(season.id)}>Activar</button>}<button type="button" className={styles.delete} onClick={()=>void remove(season.id)}><Trash2/></button></div>
        </article>)}</div>
      </section>
    </div>
  </>;
}
