"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Check, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MEXICO_STATES } from "@/lib/mexicoCatalog";
import styles from "./Patrocinadores.module.css";

type SponsorRow = {
  id: string;
  name: string;
  plan_code: string;
  membership_status: string;
  membership_ends_at: string | null;
  is_active: boolean;
  state: string | null;
  contact_name: string | null;
  contact_email: string | null;
  invited_at: string | null;
  activated_at: string | null;
};

type EditState = { name: string; planCode: string; state: string; isActive: boolean };

const PLAN_LABELS: Record<string, string> = {
  basic: "Básico · Ticket",
  intermediate: "Intermedio · Ticket + QR",
  premium: "Premium · Ticket + QR + Mapa",
};

export default function SponsorsPage() {
  const [items, setItems] = useState<SponsorRow[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState>({ name: "", planCode: "basic", state: "", isActive: true });
  const [form, setForm] = useState({ organizationName: "", name: "", email: "", planCode: "premium", state: "" });

  async function load() {
    const { data, error } = await supabase
      .from("sponsor_organizations")
      .select("id,name,plan_code,membership_status,membership_ends_at,is_active,state,contact_name,contact_email,invited_at,activated_at")
      .order("created_at", { ascending: false });
    if (error) setNotice(error.message);
    else setItems((data ?? []) as SponsorRow[]);
  }

  useEffect(() => { void load(); }, []);

  async function authFetch(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    return fetch("/api/admin/sponsors", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify(body),
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setNotice("");
    try {
      const response = await authFetch("POST", form);
      const result = await response.json();
      setNotice(result.message ?? result.error ?? "Resultado desconocido");
      if (response.ok) {
        setForm({ organizationName: "", name: "", email: "", planCode: "premium", state: "" });
        await load();
      }
    } finally { setLoading(false); }
  }

  function startEditing(item: SponsorRow) {
    setEditingId(item.id);
    setEdit({ name: item.name, planCode: item.plan_code ?? "basic", state: item.state ?? "", isActive: item.is_active });
    setNotice("");
  }

  async function save(id: string) {
    setLoading(true); setNotice("");
    try {
      const response = await authFetch("PATCH", { id, ...edit });
      const result = await response.json();
      setNotice(result.message ?? result.error ?? "Resultado desconocido");
      if (response.ok) { setEditingId(null); await load(); }
    } finally { setLoading(false); }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`¿Eliminar la marca ${name}? También se eliminará el vínculo de sus usuarios patrocinadores.`)) return;
    setLoading(true); setNotice("");
    try {
      const response = await authFetch("DELETE", { id });
      const result = await response.json();
      setNotice(result.message ?? result.error ?? "Resultado desconocido");
      if (response.ok) await load();
    } finally { setLoading(false); }
  }

  return <div className={styles.page}>
    <header>
      <div><span>ADMINISTRACIÓN</span><h1>Patrocinadores</h1><p>Crea marcas, define su estado operativo, invita al responsable y administra su plan.</p></div>
      <button onClick={() => void load()}><RefreshCw />Actualizar</button>
    </header>

    <form onSubmit={submit} className={`${styles.card} ${styles.fullForm}`}>
      <h2><Plus />Nuevo patrocinador</h2>
      <div className={styles.formGrid}>
        <label>Marca<input value={form.organizationName} onChange={(event) => setForm({ ...form, organizationName: event.target.value })} placeholder="Ej. ClickGo" required /></label>
        <label>Nombre del responsable<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Gerardo Pedraza" /></label>
        <label>Correo<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="responsable@marca.com" required /></label>
        <label>Estado<select value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} required><option value="">Selecciona un estado</option>{MEXICO_STATES.map((state) => <option key={state.code} value={state.name}>{state.name}</option>)}</select></label>
        <label>Plan<select value={form.planCode} onChange={(event) => setForm({ ...form, planCode: event.target.value })}><option value="basic">Básico · Ticket</option><option value="intermediate">Intermedio · Ticket + QR</option><option value="premium">Premium · Ticket + QR + Mapa</option></select></label>
        <div className={styles.submitCell}><button disabled={loading}>{loading ? "Procesando…" : "Crear y enviar invitación"}</button></div>
      </div>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
    </form>

    <section className={`${styles.card} ${styles.tableCard}`}>
      <h2><Building2 />Marcas registradas</h2>
      <div className={styles.tableWrap}>
        <table>
          <thead><tr><th>Marca</th><th>Responsable</th><th>Correo</th><th>Estado</th><th>Plan</th><th>Estatus</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map((item) => {
              const editing = editingId === item.id;
              return <tr key={item.id}>
                <td>{editing ? <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /> : <strong>{item.name}</strong>}</td>
                <td>{item.contact_name || "—"}</td>
                <td>{item.contact_email || "—"}</td>
                <td>{editing ? <select value={edit.state} onChange={(e) => setEdit({ ...edit, state: e.target.value })}><option value="">Sin estado</option>{MEXICO_STATES.map((state) => <option key={state.code} value={state.name}>{state.name}</option>)}</select> : (item.state || "Sin definir")}</td>
                <td>{editing ? <select value={edit.planCode} onChange={(e) => setEdit({ ...edit, planCode: e.target.value })}><option value="basic">Básico</option><option value="intermediate">Intermedio</option><option value="premium">Premium</option></select> : <span className={styles.planBadge}>{PLAN_LABELS[item.plan_code] ?? item.plan_code}</span>}</td>
                <td>{editing ? <label className={styles.switchLabel}><input type="checkbox" checked={edit.isActive} disabled={!item.activated_at} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />{!item.activated_at ? "Pendiente" : edit.isActive ? "Activo" : "Inactivo"}</label> : <span className={!item.activated_at ? styles.pendingBadge : item.is_active ? styles.activeBadge : styles.inactiveBadge}>{!item.activated_at ? "Pendiente de registro" : item.is_active ? "Activo" : "Inactivo"}</span>}</td>
                <td><div className={styles.actions}>{editing ? <><button type="button" onClick={() => void save(item.id)} title="Guardar"><Check /></button><button type="button" onClick={() => setEditingId(null)} title="Cancelar"><X /></button></> : <><button type="button" onClick={() => startEditing(item)} title="Editar"><Pencil /></button><button type="button" className={styles.deleteButton} onClick={() => void remove(item.id, item.name)} title="Eliminar"><Trash2 /></button></>}</div></td>
              </tr>;
            })}
            {!items.length && <tr><td colSpan={7} className={styles.empty}>No hay patrocinadores todavía.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
