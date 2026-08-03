"use client";

import { CheckCircle2, ExternalLink, RefreshCw, ReceiptText, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./Tickets.module.css";

type TicketRow = {
  id: string;
  status: string;
  merchant_name: string | null;
  branch_name: string | null;
  ticket_number: string | null;
  purchase_date: string | null;
  purchase_total: number | null;
  currency: string | null;
  validation_reason: string | null;
  created_at: string;
  campaign_id: string;
  user_id: string;
  campaigns: { name: string; sponsor: string | null } | null;
  profiles: { full_name: string | null; email: string | null } | null;
  ticket_images: Array<{ id: string; storage_path: string; sort_order: number }>;
};

type Editable = { total: string; folio: string; date: string; merchant: string; branch: string; reason: string };

export default function AdminTicketsPage() {
  const [items, setItems] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("pending");
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [edits, setEdits] = useState<Record<string, Editable>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    let query = supabase
      .from("ticket_submissions")
      .select("id,status,merchant_name,branch_name,ticket_number,purchase_date,purchase_total,currency,validation_reason,created_at,campaign_id,user_id,campaigns(name,sponsor),profiles!ticket_submissions_user_id_fkey(full_name,email),ticket_images(id,storage_path,sort_order)")
      .order("created_at", { ascending: false });
    if (filter === "pending") query = query.in("status", ["pending", "manual_review"]);
    else if (filter !== "all") query = query.eq("status", filter);

    const { data, error } = await query.limit(100);
    if (error) { setMessage(error.message); setItems([]); setLoading(false); return; }

    const rows = (data ?? []) as unknown as TicketRow[];
    setItems(rows);
    setEdits(Object.fromEntries(rows.map((row) => [row.id, {
      total: row.purchase_total?.toString() ?? "",
      folio: row.ticket_number ?? "",
      date: row.purchase_date ?? "",
      merchant: row.merchant_name ?? row.campaigns?.sponsor ?? "",
      branch: row.branch_name ?? "",
      reason: row.validation_reason ?? "",
    }])));

    const urls: Record<string, string[]> = {};
    await Promise.all(rows.map(async (row) => {
      const ordered = [...(row.ticket_images ?? [])].sort((a,b) => a.sort_order-b.sort_order);
      const signed = await Promise.all(ordered.map(async (image) => {
        const { data: signedData } = await supabase.storage.from("ticket-images").createSignedUrl(image.storage_path, 3600);
        return signedData?.signedUrl ?? "";
      }));
      urls[row.id] = signed.filter(Boolean);
    }));
    setImages(urls);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);
  const pendingCount = useMemo(() => items.filter((item) => ["pending","manual_review"].includes(item.status)).length, [items]);

  function updateEdit(id: string, field: keyof Editable, value: string) {
    setEdits((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    const edit = edits[id];
    if (decision === "approved" && (!edit.total || Number(edit.total) < 0)) { setMessage("Captura un monto válido antes de aprobar."); return; }
    if (decision === "rejected" && !edit.reason.trim()) { setMessage("Captura el motivo del rechazo."); return; }
    setWorkingId(id); setMessage("");
    const { data, error } = await supabase.rpc("review_ticket_submission", {
      p_submission_id: id, p_decision: decision, p_reason: edit.reason || null,
      p_purchase_total: edit.total ? Number(edit.total) : null, p_ticket_number: edit.folio || null,
      p_purchase_date: edit.date || null, p_merchant_name: edit.merchant || null, p_branch_name: edit.branch || null,
    });
    setWorkingId("");
    if (error) { setMessage(error.message); return; }
    setMessage(String((data as { message?: string } | null)?.message ?? "Revisión guardada."));
    await load();
  }

  return <main className={styles.page}>
    <header className={styles.header}><span>Operación del piloto</span><h1>Validación manual de tickets</h1><p>Revisa las fotografías, confirma los datos y aprueba o rechaza cada compra.</p></header>
    <section className={styles.toolbar}>
      <label>Mostrar<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="pending">Pendientes ({pendingCount})</option><option value="approved">Aprobados</option><option value="rejected">Rechazados</option><option value="all">Todos</option></select></label>
      <button type="button" onClick={() => void load()}><RefreshCw /> Actualizar</button>
    </section>
    {message && <p className={styles.message}>{message}</p>}
    {loading && <section className={styles.empty}>Cargando tickets...</section>}
    {!loading && !items.length && <section className={styles.empty}><ReceiptText /><h2>No hay tickets en esta sección</h2></section>}
    <section className={styles.grid}>{items.map((item) => {
      const edit = edits[item.id]; const canReview = ["pending", "manual_review"].includes(item.status);
      return <article key={item.id} className={styles.card}>
        <div className={styles.cardHead}><div><span>{item.campaigns?.sponsor ?? "Marca"}</span><h2>{item.campaigns?.name ?? "Campaña"}</h2></div><strong data-status={item.status}>{item.status === "manual_review" ? "Pendiente" : item.status}</strong></div>
        <p className={styles.user}>{item.profiles?.full_name || "Usuario"} · {item.profiles?.email || "Sin correo"}</p><small>Recibido: {new Date(item.created_at).toLocaleString("es-MX")}</small>
        <div className={styles.images}>{(images[item.id] ?? []).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Ticket ${index + 1}`} /><ExternalLink /></a>)}</div>
        {edit && <div className={styles.formGrid}>
          <label>Comercio<input value={edit.merchant} onChange={(e) => updateEdit(item.id,"merchant",e.target.value)} disabled={!canReview} /></label>
          <label>Sucursal<input value={edit.branch} onChange={(e) => updateEdit(item.id,"branch",e.target.value)} disabled={!canReview} /></label>
          <label>Folio<input value={edit.folio} onChange={(e) => updateEdit(item.id,"folio",e.target.value)} disabled={!canReview} /></label>
          <label>Fecha<input type="date" value={edit.date} onChange={(e) => updateEdit(item.id,"date",e.target.value)} disabled={!canReview} /></label>
          <label>Total (MXN)<input type="number" min="0" step="0.01" value={edit.total} onChange={(e) => updateEdit(item.id,"total",e.target.value)} disabled={!canReview} /></label>
          <label className={styles.full}>Notas / motivo<textarea rows={3} value={edit.reason} onChange={(e) => updateEdit(item.id,"reason",e.target.value)} disabled={!canReview} /></label>
        </div>}
        {canReview && <div className={styles.actions}><button className={styles.approve} disabled={workingId===item.id} onClick={() => void decide(item.id,"approved")}><CheckCircle2 /> Aprobar ticket</button><button className={styles.reject} disabled={workingId===item.id} onClick={() => void decide(item.id,"rejected")}><XCircle /> Rechazar</button></div>}
      </article>;
    })}</section>
  </main>;
}
