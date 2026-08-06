"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Check, Pencil, Plus, RefreshCw, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import styles from "./Patrocinadores.module.css";

type SponsorRow = {
  id: string;
  name: string;
  plan_code: string;
  membership_status: string;
  membership_ends_at: string | null;
};

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
  const [editingPlan, setEditingPlan] = useState("basic");
  const [form, setForm] = useState({ organizationName: "", name: "", email: "", planCode: "premium" });

  async function load() {
    const { data, error } = await supabase
      .from("sponsor_organizations")
      .select("id,name,plan_code,membership_status,membership_ends_at")
      .order("created_at", { ascending: false });
    if (error) setNotice(error.message);
    else setItems((data ?? []) as SponsorRow[]);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    setNotice(result.message ?? result.error ?? "Resultado desconocido");
    if (response.ok) {
      setForm({ organizationName: "", name: "", email: "", planCode: "premium" });
      await load();
    }
    setLoading(false);
  }

  function startEditing(item: SponsorRow) {
    setEditingId(item.id);
    setEditingPlan(item.plan_code ?? "basic");
    setNotice("");
  }

  async function savePlan(id: string) {
    const { error } = await supabase.from("sponsor_organizations").update({ plan_code: editingPlan }).eq("id", id);
    if (error) setNotice(error.message);
    else {
      setNotice("Plan actualizado correctamente.");
      setEditingId(null);
      await load();
    }
  }

  return (
    <div className={styles.page}>
      <header>
        <div><span>ADMINISTRACIÓN</span><h1>Patrocinadores</h1><p>Crea marcas, invita a su usuario responsable y administra su plan.</p></div>
        <button onClick={() => void load()}><RefreshCw />Actualizar</button>
      </header>

      <div className={styles.grid}>
        <form onSubmit={submit} className={styles.card}>
          <h2><Plus />Nuevo patrocinador</h2>
          <label>Marca<input value={form.organizationName} onChange={(event) => setForm({ ...form, organizationName: event.target.value })} required /></label>
          <label>Nombre del responsable<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Correo<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Plan<select value={form.planCode} onChange={(event) => setForm({ ...form, planCode: event.target.value })}><option value="basic">Básico · Ticket</option><option value="intermediate">Intermedio · Ticket + QR</option><option value="premium">Premium · Ticket + QR + Mapa</option></select></label>
          <button disabled={loading}>{loading ? "Creando…" : "Crear y enviar invitación"}</button>
          {notice && <p className={styles.notice} role="status">{notice}</p>}
        </form>

        <section className={styles.card}>
          <h2><Building2 />Marcas registradas</h2>
          <div className={styles.list}>
            {items.map((item) => {
              const editing = editingId === item.id;
              return (
                <article key={item.id}>
                  <div className={styles.sponsorIdentity}><strong>{item.name}</strong><small>{item.membership_status}</small></div>
                  <div className={styles.planEditor}>
                    {editing ? (
                      <>
                        <select value={editingPlan} onChange={(event) => setEditingPlan(event.target.value)} autoFocus><option value="basic">Básico</option><option value="intermediate">Intermedio</option><option value="premium">Premium</option></select>
                        <button type="button" className={styles.iconButton} onClick={() => void savePlan(item.id)} aria-label="Guardar plan"><Check /></button>
                        <button type="button" className={styles.iconButton} onClick={() => setEditingId(null)} aria-label="Cancelar"><X /></button>
                      </>
                    ) : (
                      <>
                        <span className={styles.planBadge}>{PLAN_LABELS[item.plan_code] ?? item.plan_code}</span>
                        <button type="button" className={styles.editButton} onClick={() => startEditing(item)}><Pencil />Editar</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
            {!items.length && <p>No hay patrocinadores todavía.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
