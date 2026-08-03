"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import styles from "./SponsorCampaignReview.module.css";

type ApprovalStatus = "draft" | "in_review" | "approved" | "changes_requested" | "rejected";
type Decision = "approved" | "changes_requested" | "rejected";

type SponsorCampaign = {
  campaign_id: string;
  organization_id: string;
  approval_status: ApprovalStatus;
  submitted_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
  campaigns: {
    id: string;
    name: string;
    sponsor: string | null;
    description: string | null;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string;
    campaign_budgets: {
      media_budget: number;
      rewards_budget: number;
      other_costs: number;
      currency: string;
    } | null;
  } | null;
  sponsor_organizations: {
    name: string;
  } | null;
};

const statusLabels: Record<ApprovalStatus, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobada",
  changes_requested: "Cambios solicitados",
  rejected: "Rechazada",
};

export default function SponsorCampaignReviewPage() {
  const searchParams = useSearchParams();
  const requestedCampaign = searchParams.get("campaign") ?? "";
  const [rows, setRows] = useState<SponsorCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("in_review");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("campaign_sponsors")
      .select(`
        campaign_id,
        organization_id,
        approval_status,
        submitted_at,
        reviewed_at,
        review_notes,
        campaigns(id,name,sponsor,description,status,starts_at,ends_at,created_at,campaign_budgets(media_budget,rewards_budget,other_costs,currency)),
        sponsor_organizations(name)
      `)
      .order("submitted_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as unknown as SponsorCampaign[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(
    () => rows.filter((row) => requestedCampaign ? row.campaign_id === requestedCampaign : (filter === "all" || row.approval_status === filter)),
    [filter, requestedCampaign, rows]
  );

  async function review(campaignId: string, decision: Decision) {
    if ((decision === "changes_requested" || decision === "rejected") && !notes[campaignId]?.trim()) {
      setMessage("Escribe el motivo antes de solicitar cambios o rechazar la campaña.");
      return;
    }

    setWorkingId(campaignId);
    setMessage("");
    const { error } = await supabase.rpc("review_sponsor_campaign", {
      p_campaign_id: campaignId,
      p_decision: decision,
      p_notes: notes[campaignId]?.trim() || null,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        decision === "approved"
          ? "Campaña aprobada correctamente."
          : decision === "changes_requested"
            ? "Se solicitaron cambios al patrocinador."
            : "Campaña rechazada."
      );
      setNotes((current) => ({ ...current, [campaignId]: "" }));
      await load();
    }
    setWorkingId("");
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span>Patrocinadores</span>
        <h1>Aprobación de campañas</h1>
        <p>Revisa las propuestas enviadas por las marcas antes de publicarlas.</p>
      </header>

      {requestedCampaign ? <p className={styles.message}>Mostrando la campaña seleccionada desde la notificación.</p> : null}

      <div className={styles.toolbar}>
        <label>
          Estado
          <select value={filter} onChange={(event) => setFilter(event.target.value as ApprovalStatus | "all")}>
            <option value="in_review">En revisión</option>
            <option value="changes_requested">Cambios solicitados</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="draft">Borrador</option>
            <option value="all">Todas</option>
          </select>
        </label>
        <button type="button" onClick={() => void load()}><RotateCcw />Actualizar</button>
      </div>

      {message ? <p className={styles.message}>{message}</p> : null}

      {loading ? (
        <div className={styles.empty}>Cargando solicitudes…</div>
      ) : visibleRows.length === 0 ? (
        <div className={styles.empty}>No hay campañas con este estado.</div>
      ) : (
        <div className={styles.grid}>
          {visibleRows.map((row) => {
            const campaign = row.campaigns;
            const budget = campaign?.campaign_budgets;
            const totalInvestment = Number(budget?.media_budget ?? 0) + Number(budget?.rewards_budget ?? 0) + Number(budget?.other_costs ?? 0);
            const isPending = row.approval_status === "in_review";
            return (
              <article key={row.campaign_id} className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <span className={styles.organization}>{row.sponsor_organizations?.name ?? campaign?.sponsor ?? "Marca"}</span>
                    <h2>{campaign?.name ?? "Campaña sin nombre"}</h2>
                  </div>
                  <span className={styles.status} data-status={row.approval_status}>{statusLabels[row.approval_status]}</span>
                </div>

                <p className={styles.description}>{campaign?.description || "Sin descripción."}</p>

                <dl className={styles.metrics}>
                  <div><dt>Periodo</dt><dd>{formatDate(campaign?.starts_at)} – {formatDate(campaign?.ends_at)}</dd></div>
                  <div><dt>Inversión declarada</dt><dd>{formatCurrency(totalInvestment, budget?.currency)}</dd></div>
                  <div><dt>Enviada</dt><dd>{formatDateTime(row.submitted_at)}</dd></div>
                  <div><dt>Estado de publicación</dt><dd>{campaign?.status ?? "draft"}</dd></div>
                </dl>

                {row.review_notes ? <div className={styles.previousNote}><strong>Última observación</strong><p>{row.review_notes}</p></div> : null}

                {isPending ? (
                  <>
                    <label className={styles.notes}>
                      Comentarios para la marca
                      <textarea
                        rows={3}
                        placeholder="Opcional al aprobar; obligatorio al pedir cambios o rechazar."
                        value={notes[row.campaign_id] ?? ""}
                        onChange={(event) => setNotes((current) => ({ ...current, [row.campaign_id]: event.target.value }))}
                      />
                    </label>
                    <div className={styles.actions}>
                      <button type="button" className={styles.approve} disabled={workingId === row.campaign_id} onClick={() => void review(row.campaign_id, "approved")}><CheckCircle2 />Aprobar</button>
                      <button type="button" className={styles.changes} disabled={workingId === row.campaign_id} onClick={() => void review(row.campaign_id, "changes_requested")}><Clock3 />Solicitar cambios</button>
                      <button type="button" className={styles.reject} disabled={workingId === row.campaign_id} onClick={() => void review(row.campaign_id, "rejected")}><XCircle />Rechazar</button>
                    </div>
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("es-MX") : "Sin definir";
}

function formatDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("es-MX") : "—";
}

function formatCurrency(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency || "MXN" }).format(value);
}
