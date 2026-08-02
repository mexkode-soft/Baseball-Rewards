"use client";

import {
  CalendarDays,
  CheckCircle2,
  Download,
  FileArchive,
  FileSpreadsheet,
  Gift,
  ImagePlus,
  MapPin,
  QrCode,
  Save,
  ScanLine,
  Store,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./CrearCampana.module.css";
import DynamicCampaignBuilder from "@/components/DynamicCampaignBuilder";
import {
  createId,
  generateQrCodes,
  saveQrCampaign,
  type QrCampaign,
  type QrCampaignStatus,
  type QrCodeRecord,
} from "@/lib/qrCampaigns";

type CampaignType = "qr" | "brand" | "map";

const campaignTypes = [
  { id: "qr" as const, title: "Búsqueda QR", description: "Genera códigos para estadio, impresos o pantallas.", icon: QrCode },
  { id: "brand" as const, title: "Visita a marca", description: "Ticket, IA y validación de ubicación.", icon: Store },
  { id: "map" as const, title: "Recompensa en mapa", description: "Ubicación, encuesta y entrega de recompensa.", icon: MapPin },
];

function escapeCsv(value: string | number | boolean) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CrearCampanaPage() {
  const [campaignType, setCampaignType] = useState<CampaignType>("qr");
  const [campaignId, setCampaignId] = useState(() => createId("campaign"));
  const [campaignName, setCampaignName] = useState("Tesoro del estadio");
  const [sponsor, setSponsor] = useState("Home Run Rewards");
  const [description, setDescription] = useState("Encuentra los códigos QR escondidos dentro del estadio y descubre si ganaste.");
  const [startDate, setStartDate] = useState("2026-08-02");
  const [endDate, setEndDate] = useState("2026-08-09");
  const [status, setStatus] = useState<QrCampaignStatus>("active");
  const [totalCodes, setTotalCodes] = useState(15);
  const [winnerCodes, setWinnerCodes] = useState(3);
  const [attemptsPerUser, setAttemptsPerUser] = useState(15);
  const [reward, setReward] = useState("20% de descuento");
  const [participationPoints, setParticipationPoints] = useState(10);
  const [winnerPoints, setWinnerPoints] = useState(100);
  const [codes, setCodes] = useState<QrCodeRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);

  const selectedType = useMemo(
    () => campaignTypes.find((item) => item.id === campaignType) ?? campaignTypes[0],
    [campaignType]
  );

  function buildCampaign(): QrCampaign {
    return {
      id: campaignId,
      type: "qr",
      name: campaignName.trim(),
      sponsor: sponsor.trim(),
      description: description.trim(),
      startDate,
      endDate,
      status,
      attemptsPerUser: Math.max(1, attemptsPerUser),
      participationPoints: Math.max(0, participationPoints),
      winnerPoints: Math.max(0, winnerPoints),
      reward: reward.trim(),
      createdAt: new Date().toISOString(),
      codes,
    };
  }

  function generateCodes() {
    const total = Math.max(1, Math.floor(totalCodes));
    const winners = Math.max(0, Math.min(total, Math.floor(winnerCodes)));

    const generated = generateQrCodes({
      campaignId,
      total,
      winners,
      reward,
      participationPoints,
      winnerPoints,
    });

    setTotalCodes(total);
    setWinnerCodes(winners);
    setCodes(generated);
    setNotice(`Se generaron ${total} códigos únicos: ${winners} ganadores y ${total - winners} sin premio.`);
  }

  function saveCampaign() {
    if (!campaignName.trim()) {
      setNotice("Escribe un nombre para la campaña.");
      return;
    }
    if (codes.length === 0) {
      setNotice("Primero genera los códigos QR.");
      return;
    }

    saveQrCampaign(buildCampaign());
    setNotice("Campaña guardada. Ya puedes probarla en el escáner QR.");
  }

  async function downloadZip() {
    if (!codes.length) return setNotice("Primero genera los códigos QR.");
    setWorking(true);
    try {
      const [{ default: QRCode }, { default: JSZip }] = await Promise.all([import("qrcode"), import("jszip")]);
      const zip = new JSZip();
      const folder = zip.folder(campaignName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "campana-qr");

      for (const code of codes) {
        const dataUrl = await QRCode.toDataURL(code.payload, { width: 1200, margin: 4, errorCorrectionLevel: "H" });
        folder?.file(`${code.label}.png`, dataUrl.split(",")[1], { base64: true });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${campaignName || "campana"}-QR.zip`);
    } finally {
      setWorking(false);
    }
  }

  async function downloadPdf() {
    if (!codes.length) return setNotice("Primero genera los códigos QR.");
    setWorking(true);
    try {
      const [{ default: QRCode }, { jsPDF }] = await Promise.all([import("qrcode"), import("jspdf")]);
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const positions = [
        [18, 25], [110, 25],
        [18, 115], [110, 115],
      ];

      for (let index = 0; index < codes.length; index += 1) {
        if (index > 0 && index % 4 === 0) pdf.addPage();
        const [x, y] = positions[index % 4];
        const code = codes[index];
        const dataUrl = await QRCode.toDataURL(code.payload, { width: 700, margin: 3, errorCorrectionLevel: "H" });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text(campaignName, x, y - 7, { maxWidth: 78 });
        pdf.addImage(dataUrl, "PNG", x, y, 72, 72);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(code.label, x + 36, y + 78, { align: "center" });
        pdf.setFontSize(8);
        pdf.text("Escanea con Home Run Rewards", x + 36, y + 83, { align: "center" });
      }

      pdf.save(`${campaignName || "campana"}-impresion.pdf`);
    } finally {
      setWorking(false);
    }
  }

  function downloadCsv() {
    if (!codes.length) return setNotice("Primero genera los códigos QR.");
    const rows = [
      ["Etiqueta", "Token", "Ganador", "Premio", "Puntos", "Payload"],
      ...codes.map((code) => [code.label, code.token, code.isWinner, code.reward, code.points, code.payload]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), `${campaignName || "campana"}-administrativo.csv`);
  }

  function resetCampaign() {
    setCampaignId(createId("campaign"));
    setCodes([]);
    setNotice("Se preparó una campaña nueva.");
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <span>Administración</span>
          <h1>Crear campaña</h1>
          <p>Configura la dinámica completa y genera los materiales que usarás en el estadio.</p>
        </div>
        <div className={styles.headerSummary}><Trophy /><div><strong>3</strong><span>modalidades</span></div></div>
      </header>

      <section className={styles.typeSection}>
        <div className={styles.sectionHeading}><div><span>Paso 1</span><h2>Selecciona la modalidad</h2><p>El formulario cambia según la experiencia.</p></div></div>
        <div className={styles.typeGrid}>
          {campaignTypes.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className={`${styles.typeCard} ${campaignType === item.id ? styles.typeCardActive : ""}`} onClick={() => setCampaignType(item.id)}>
                <div className={`${styles.typeIcon} ${styles[`typeIcon_${item.id}`]}`}><Icon /></div>
                <div><strong>{item.title}</strong><p>{item.description}</p></div>
              </button>
            );
          })}
        </div>
      </section>

      {campaignType !== "qr" ? (
        <DynamicCampaignBuilder type={campaignType} />
      ) : (
        <div className={styles.workspace}>
          <main className={styles.mainColumn}>
            <section className={styles.panel}>
              <div className={styles.sectionHeading}><div><span>Paso 2</span><h2>Información general</h2><p>Datos visibles para el usuario.</p></div><div className={styles.modeBadge}><QrCode /> Búsqueda QR</div></div>
              <div className={styles.formGrid}>
                <label><span>Nombre</span><input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} /></label>
                <label><span>Patrocinador</span><input value={sponsor} onChange={(event) => setSponsor(event.target.value)} /></label>
                <label><span>Fecha de inicio</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
                <label><span>Fecha de cierre</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
                <label className={styles.fullField}><span>Descripción</span><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
                <label className={styles.uploadField}><ImagePlus /><div><strong>Imagen de portada</strong><span>PNG, JPG o WEBP</span></div><input type="file" accept="image/*" /></label>
              </div>
            </section>

            <section className={`${styles.panel} ${styles.qrPanel}`}>
              <div className={styles.sectionHeading}><div><span>Paso 3</span><h2>Generador de códigos QR</h2><p>Los ganadores se distribuyen aleatoriamente.</p></div></div>
              <div className={styles.formGrid}>
                <label><span>Total de códigos</span><input type="number" min={1} value={totalCodes} onChange={(event) => setTotalCodes(Number(event.target.value))} /></label>
                <label><span>Códigos ganadores</span><input type="number" min={0} max={totalCodes} value={winnerCodes} onChange={(event) => setWinnerCodes(Number(event.target.value))} /></label>
                <label><span>Intentos por usuario</span><input type="number" min={1} value={attemptsPerUser} onChange={(event) => setAttemptsPerUser(Number(event.target.value))} /></label>
                <label><span>Premio o descuento</span><input value={reward} onChange={(event) => setReward(event.target.value)} /></label>
                <label><span>Puntos por QR sin premio</span><input type="number" min={0} value={participationPoints} onChange={(event) => setParticipationPoints(Number(event.target.value))} /></label>
                <label><span>Puntos por QR ganador</span><input type="number" min={0} value={winnerPoints} onChange={(event) => setWinnerPoints(Number(event.target.value))} /></label>
              </div>
              <div className={styles.generatorActions}>
                <button type="button" className={styles.generateButton} onClick={generateCodes}><ScanLine /> {codes.length ? "Regenerar códigos" : "Generar códigos"}</button>
                {codes.length > 0 && <button type="button" className={styles.secondaryButton} onClick={resetCampaign}>Nueva campaña</button>}
              </div>
              {notice && <div className={styles.notice}><CheckCircle2 /><span>{notice}</span></div>}
            </section>

            {codes.length > 0 && (
              <section className={styles.panel}>
                <div className={styles.sectionHeading}><div><span>Paso 4</span><h2>Códigos generados</h2><p>La columna Resultado solo es visible para administradores.</p></div><span className={styles.codeCount}>{codes.length} QR</span></div>
                <div className={styles.downloadBar}>
                  <button type="button" onClick={downloadPdf} disabled={working}><Download /> PDF para imprimir</button>
                  <button type="button" onClick={downloadZip} disabled={working}><FileArchive /> ZIP con PNG</button>
                  <button type="button" onClick={downloadCsv}><FileSpreadsheet /> CSV administrativo</button>
                </div>
                <div className={styles.tableScroller}>
                  <table className={styles.qrTable}>
                    <thead><tr><th>QR</th><th>Resultado</th><th>Premio</th><th>Puntos</th><th>Token</th></tr></thead>
                    <tbody>{codes.map((code) => <tr key={code.id}><td><strong>{code.label}</strong></td><td><span className={code.isWinner ? styles.winnerBadge : styles.normalBadge}>{code.isWinner ? "Ganador" : "Sin premio"}</span></td><td>{code.reward || "Sigue participando"}</td><td>+{code.points}</td><td><code>{code.token.slice(0, 12)}…</code></td></tr>)}</tbody>
                  </table>
                </div>
              </section>
            )}

            <section className={styles.panel}>
              <div className={styles.sectionHeading}><div><span>Paso 5</span><h2>Publicación</h2><p>Guarda la campaña para probarla con el escáner.</p></div></div>
              <div className={styles.formGrid}>
                <label><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value as QrCampaignStatus)}><option value="draft">Borrador</option><option value="scheduled">Programada</option><option value="active">Activa</option></select></label>
                <div className={styles.summaryCard}><Gift /><div><strong>{reward}</strong><span>{winnerCodes} ganadores · {totalCodes - winnerCodes} sin premio</span></div></div>
              </div>
              <div className={styles.footerActions}><a href="/usuario/cazar-recompensas/qr"><QrCode /> Abrir escáner</a><button type="button" className={styles.primaryButton} onClick={saveCampaign}><Save /> Guardar campaña</button></div>
            </section>
          </main>

          <aside className={styles.previewColumn}>
            <section className={styles.previewPanel}>
              <div className={styles.previewImage}><QrCode /></div>
              <div className={styles.previewContent}><span>Búsqueda QR</span><h2>{campaignName || "Nombre de campaña"}</h2><p>{description}</p><div className={styles.previewMeta}><div><CalendarDays /><span>{startDate}</span></div><div><Gift /><span>{reward}</span></div></div></div>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
