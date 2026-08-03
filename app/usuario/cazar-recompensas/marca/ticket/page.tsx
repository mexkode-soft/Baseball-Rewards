"use client";

import { ArrowLeft, CheckCircle2, MapPin, ReceiptText, Send, Store, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "../../CazarRecompensas.module.css";
import { persistTicketSubmission } from "@/lib/tickets";
import { readActiveDynamicCampaigns, type BrandCampaign } from "@/lib/campaignDynamics";

export default function BrandTicketPage() {
  const campaignId = useSearchParams().get("campaign") ?? "";
  const [campaign, setCampaign] = useState<BrandCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [branchId, setBranchId] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [total, setTotal] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    void readActiveDynamicCampaigns("brand").then((items) => {
      if (!active) return;
      const found = (items as BrandCampaign[]).find((item) => item.id === campaignId) ?? null;
      setCampaign(found);
      setBranchId(found?.locations[0]?.id ?? "");
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [campaignId]);

  const selectedBranch = useMemo(() => campaign?.locations.find((location) => location.id === branchId) ?? campaign?.locations[0], [campaign, branchId]);

  async function submit() {
    if (!campaign || !selectedBranch || !files.length || !ticketNumber.trim() || !purchaseDate || !total || Number(total) <= 0) {
      setResult({ ok: false, message: "Completa la sucursal, folio, fecha, monto y fotografía del ticket." });
      return;
    }
    setWorking(true);
    setResult(null);
    try {
      await persistTicketSubmission({
        campaign,
        files,
        coords: { lat: selectedBranch.latitude, lng: selectedBranch.longitude, accuracy: 0 },
        analysis: {
          status: "review",
          message: "Ticket recibido. Nuestro equipo lo revisará manualmente.",
          extraction: {
            merchantName: campaign.brandName,
            branch: selectedBranch.name,
            ticketNumber: ticketNumber.trim(),
            purchaseDate,
            total: Number(total),
            currency: "MXN",
            products: [],
            confidence: 1,
          },
        },
      });
      setFiles([]); setTicketNumber(""); setTotal("");
      setResult({ ok: true, message: "¡Listo! Tu ticket fue enviado. Te avisaremos en la campanita cuando sea aprobado o rechazado." });
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "No fue posible enviar el ticket." });
    } finally { setWorking(false); }
  }

  if (loading) return <main className={`${styles.mobileStage} ${styles.ticketStage}`}><section className={styles.emptyCard}><ReceiptText /><h2>Cargando campaña...</h2></section></main>;
  if (!campaign) return <main className={`${styles.mobileStage} ${styles.ticketStage}`}><section className={styles.emptyCard}><XCircle /><h2>Campaña no disponible</h2></section></main>;

  return <main className={`${styles.mobileStage} ${styles.ticketStage}`}>
    <div className={styles.topBar}><Link href="/usuario/cazar-recompensas/marca" className={styles.backButton} aria-label="Regresar"><ArrowLeft /></Link><span>{campaign.brandName}</span></div>
    <section className={styles.ticketPanel}>
      <div className={styles.eyebrow}><ReceiptText />Validación manual</div>
      <h1>{campaign.name}</h1>
      <p>Compra en una sucursal participante, toma una foto clara y envíala. Un administrador revisará el ticket.</p>

      <div className={styles.ticketResult}>
        <Store /><h2>¿Dónde comprar?</h2>
        <p><strong>{campaign.brandName}</strong></p>
        {campaign.locations.map((location) => <small key={location.id}>{location.name}{location.address ? ` · ${location.address}` : ""}</small>)}
        <p>Compra mínima: <strong>${campaign.minimumTotal.toLocaleString("es-MX")} MXN</strong></p>
      </div>

      <label className={styles.ticketField}>Sucursal participante
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          {campaign.locations.map((location) => <option key={location.id} value={location.id}>{location.name}{location.address ? ` — ${location.address}` : ""}</option>)}
        </select>
      </label>
      <label className={styles.ticketField}>Folio del ticket<input value={ticketNumber} onChange={(event) => setTicketNumber(event.target.value)} placeholder="Ej. A-102938" /></label>
      <label className={styles.ticketField}>Fecha de compra<input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} /></label>
      <label className={styles.ticketField}>Monto total (MXN)<input type="number" min="0" step="0.01" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="300.00" /></label>

      <label className={styles.ticketUpload}><Upload /><strong>Seleccionar fotos</strong><span>{files.length}/3 imágenes</span><input type="file" accept="image/*" capture="environment" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))} /></label>

      {selectedBranch && <div className={styles.locationButton}><MapPin />Sucursal seleccionada: {selectedBranch.name}</div>}

      <button type="button" className={`${styles.cameraButton} ${styles.ticketSubmitButton}`} onClick={() => void submit()} disabled={working}>
        <Send />{working ? "Enviando ticket..." : "Enviar para revisión"}
      </button>

      {result && <div className={`${styles.ticketResult} ${result.ok ? styles.ticket_review : styles.ticket_rejected}`}>
        {result.ok ? <CheckCircle2 /> : <XCircle />}<h2>{result.ok ? "Ticket enviado" : "Revisa los datos"}</h2><p>{result.message}</p>
        {result.ok && <Link href="/usuario">Volver al inicio</Link>}
      </div>}
    </section>
  </main>;
}
