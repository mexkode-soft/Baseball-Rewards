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
  Trash2,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import styles from "./CrearCampana.module.css";
import DynamicCampaignBuilder from "@/components/DynamicCampaignBuilder";
import {
  createId,
  createQrPayload,
  generateQrCodes,
  readQrCampaigns,
  saveQrCampaign,
  type QrCampaign,
  type QrCampaignStatus,
  type QrCodeRecord,
} from "@/lib/qrCampaigns";
import { supabase } from "@/lib/supabase";
import { getStateCode, MEXICO_STATES } from "@/lib/mexicoCatalog";

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
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const sponsorMode = pathname.startsWith("/patrocinador");
  const editId = params.get("id") ?? "";
  const requestedType = params.get("type") as CampaignType | null;
  const [campaignType, setCampaignType] = useState<CampaignType>("qr");
  const [campaignId, setCampaignId] = useState(() => createId("campaign"));
  const [campaignName, setCampaignName] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [description, setDescription] = useState("");
  const [targetState, setTargetState] = useState("");
  const [targetMunicipality, setTargetMunicipality] = useState("");
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<QrCampaignStatus>("active");
  const [totalCodes, setTotalCodes] = useState(15);
  const [winnerCodes, setWinnerCodes] = useState(3);
  const [attemptsPerUser, setAttemptsPerUser] = useState(15);
  const [reward, setReward] = useState("");
  const [rewardValidityDays, setRewardValidityDays] = useState(15);
  const [participationPoints, setParticipationPoints] = useState(10);
  const [winnerPoints, setWinnerPoints] = useState(100);
  const [codes, setCodes] = useState<QrCodeRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState("");
  const [sponsorOrganizationId, setSponsorOrganizationId] = useState("");
  const [sponsorPlan, setSponsorPlan] = useState<{ allows_ticket:boolean; allows_qr:boolean; allows_map:boolean } | null>(null);


  useEffect(() => {
    if (!sponsorMode) return;
    void (async () => {
      const { data, error } = await supabase
        .from("sponsor_members")
        .select("organization_id,sponsor_organizations(name,state,plan_code,subscription_plans(allows_ticket,allows_qr,allows_map))")
        .limit(1)
        .maybeSingle();
      if (error || !data?.organization_id) {
        setNotice(error?.message ?? "No se encontró la organización del patrocinador.");
        return;
      }
      const organization = Array.isArray(data.sponsor_organizations) ? data.sponsor_organizations[0] : data.sponsor_organizations;
      const planData = Array.isArray(organization?.subscription_plans) ? organization?.subscription_plans[0] : organization?.subscription_plans;
      setSponsorOrganizationId(String(data.organization_id));
      setSponsor(String(organization?.name ?? ""));
      setTargetState(String(organization?.state ?? ""));
      setTargetMunicipality("");
      setSponsorPlan(planData ? {
        allows_ticket: Boolean(planData.allows_ticket),
        allows_qr: Boolean(planData.allows_qr),
        allows_map: Boolean(planData.allows_map),
      } : null);
    })();
  }, [sponsorMode]);

  useEffect(() => {
    const code = getStateCode(targetState);
    if (!code) { setMunicipalities([]); setTargetMunicipality(""); return; }
    const controller = new AbortController();
    void fetch(`/api/geo/municipalities?state=${code}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { municipalities?: string[] }) => {
        const options = payload.municipalities ?? [];
        setMunicipalities(options);
        setTargetMunicipality((current) => current && options.includes(current) ? current : "");
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [targetState]);

  useEffect(() => {
    if (requestedType && campaignTypes.some((item) => item.id === requestedType)) setCampaignType(requestedType);
  }, [requestedType]);

  useEffect(() => {
    if (!editId || requestedType !== "qr") return;
    let active = true;
    void readQrCampaigns().then((items) => {
      const item = items.find((campaign) => campaign.id === editId);
      if (!active || !item) return;
      setCampaignId(item.id); setCampaignName(item.name); setSponsor(item.sponsor); setDescription(item.description); setTargetState(item.targetState ?? ""); setTargetMunicipality(item.targetMunicipality ?? "");
      setStartDate(item.startDate); setEndDate(item.endDate); setStatus(item.status); setAttemptsPerUser(item.attemptsPerUser);
      setParticipationPoints(item.participationPoints); setWinnerPoints(item.winnerPoints); setReward(item.reward); setRewardValidityDays(item.rewardValidityDays ?? 15);
      setTotalCodes(item.codes.length || 15); setWinnerCodes(item.codes.filter((code) => code.isWinner).length || 0);
      setExistingCoverUrl(item.coverUrl ?? "");
      setCoverPreview(item.coverUrl ?? "");

      const recoverableCodes = item.codes.filter((code) => Boolean(code.token && code.payload));
      if (recoverableCodes.length === item.codes.length && recoverableCodes.length > 0) {
        setCodes(recoverableCodes);
        setNotice("Campaña cargada. Los códigos QR existentes se conservaron y puedes descargarlos nuevamente.");
      } else {
        const regenerated = generateQrCodes({
          campaignId: item.id,
          total: item.codes.length || 15,
          winners: item.codes.filter((code) => code.isWinner).length || 0,
          reward: item.reward,
          participationPoints: item.participationPoints,
          winnerPoints: item.winnerPoints,
        });
        setCodes(regenerated);
        setNotice("Esta campaña usaba el formato anterior. Se generó un nuevo juego de QR que quedará asociado al guardar. Los QR impresos anteriormente ya no podrán recuperarse porque solo se almacenaba su hash.");
      }
    }).catch((error) => setNotice(error instanceof Error ? error.message : "No se pudo cargar la campaña."));
    return () => { active = false; };
  }, [editId, requestedType]);

  // Mantiene los QR existentes sincronizados con la configuración editable.
  // Los tokens y qué códigos son ganadores no cambian; solo premio/puntos.
  useEffect(() => {
    setCodes((current) => current.map((code) => ({
      ...code,
      reward: code.isWinner ? (reward.trim() || "Premio") : "",
      points: code.isWinner ? Math.max(0, winnerPoints) : Math.max(0, participationPoints),
    })));
  }, [reward, participationPoints, winnerPoints]);

  const allowedCampaignTypes = useMemo(() => ({
    qr: !sponsorMode || sponsorPlan?.allows_qr !== false,
    brand: !sponsorMode || sponsorPlan?.allows_ticket !== false,
    map: !sponsorMode || sponsorPlan?.allows_map !== false,
  }), [sponsorMode, sponsorPlan]);

  async function sendCampaignForApproval(campaignId: string) {
    if (!sponsorMode) return;
    if (!sponsorOrganizationId) throw new Error("No se encontró la organización del patrocinador.");

    const { data: existing, error: readError } = await supabase
      .from("campaign_sponsors")
      .select("campaign_id")
      .eq("campaign_id", campaignId)
      .eq("organization_id", sponsorOrganizationId)
      .maybeSingle();
    if (readError) throw readError;

    const payload = {
      campaign_id: campaignId,
      organization_id: sponsorOrganizationId,
      approval_status: "in_review",
    };
    const { error } = existing
      ? await supabase.from("campaign_sponsors").update({ approval_status: "in_review" }).eq("campaign_id", campaignId).eq("organization_id", sponsorOrganizationId)
      : await supabase.from("campaign_sponsors").insert(payload);
    if (error) throw error;
  }

  const selectedType = useMemo(
    () => campaignTypes.find((item) => item.id === campaignType) ?? campaignTypes[0],
    [campaignType]
  );


  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    event.target.value = "";
  }

  function removeCover() {
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverPreview("");
    setCoverFile(null);
    setExistingCoverUrl("");
  }

  function buildCampaign(): QrCampaign {
    return {
      id: campaignId,
      type: "qr",
      name: campaignName.trim(),
      sponsor: sponsor.trim(),
      description: description.trim(),
      coverUrl: existingCoverUrl,
      targetState, targetMunicipality,
      startDate,
      endDate,
      status: sponsorMode ? "draft" : status,
      attemptsPerUser: Math.max(1, attemptsPerUser),
      participationPoints: Math.max(0, participationPoints),
      winnerPoints: Math.max(0, winnerPoints),
      reward: reward.trim(),
      rewardValidityDays: Math.max(1, rewardValidityDays),
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

  async function saveCampaign() {
    if (!campaignName.trim()) {
      setNotice("Escribe un nombre para la campaña.");
      return;
    }
    if (!targetState) {
      setNotice("Selecciona el estado al que corresponde la campaña.");
      return;
    }
    if (codes.length === 0) {
      setNotice("Primero genera los códigos QR.");
      return;
    }

    setWorking(true);
    try {
      let coverUrl = existingCoverUrl;
      if (coverFile) {
        const extension = coverFile.name.split(".").pop()?.toLowerCase() || "webp";
        const path = `${campaignId}/${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("campaign-images").upload(path, coverFile, { upsert: true });
        if (uploadError) throw uploadError;
        coverUrl = supabase.storage.from("campaign-images").getPublicUrl(path).data.publicUrl;
        setExistingCoverUrl(coverUrl);
      }
      const savedId = await saveQrCampaign({ ...buildCampaign(), coverUrl });
      await sendCampaignForApproval(savedId);
      setCampaignId(savedId);
      setCodes((current) => current.map((code) => ({ ...code, payload: createQrPayload(savedId, code.token) })));
      setNotice(sponsorMode ? "Campaña enviada a aprobación correctamente." : "Campaña guardada correctamente. Ya puedes probarla en el escáner QR.");
      if (sponsorMode) window.setTimeout(() => router.push("/patrocinador/campanas"), 900);
      window.setTimeout(() => setNotice(""), 3800);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar la campaña.");
    } finally { setWorking(false); }
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
      const positions = [[66, 22], [66, 148]];

      for (let index = 0; index < codes.length; index += 1) {
        if (index > 0 && index % 2 === 0) pdf.addPage();
        const [x, y] = positions[index % 2];
        const code = codes[index];
        const dataUrl = await QRCode.toDataURL(code.payload, { width: 700, margin: 3, errorCorrectionLevel: "H" });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        const safeTitle = campaignName.trim() || "Home Run Rewards";
        pdf.text(safeTitle, x + 39, y, { align: "center", maxWidth: 92 });
        pdf.addImage(dataUrl, "PNG", x, y + 7, 78, 78);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(code.label, x + 39, y + 91, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text("Escanea con Home Run Rewards", x + 39, y + 97, { align: "center" });
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
          <span>{sponsorMode ? "Portal del patrocinador" : "Administración"}</span>
          <h1>Crear campaña</h1>
          <p>{sponsorMode ? "Configura la dinámica completa. Al terminar se enviará al administrador para su aprobación." : "Configura la dinámica completa y genera los materiales que usarás en el estadio."}</p>
        </div>
        <div className={styles.headerSummary}><Trophy /><div><strong>3</strong><span>modalidades</span></div></div>
      </header>

      <section className={styles.typeSection}>
        <div className={styles.sectionHeading}><div><span>Paso 1</span><h2>Selecciona la modalidad</h2><p>El formulario cambia según la experiencia.</p></div></div>
        <div className={styles.typeGrid}>
          {campaignTypes.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" disabled={!allowedCampaignTypes[item.id]} className={`${styles.typeCard} ${campaignType === item.id ? styles.typeCardActive : ""}`} onClick={() => allowedCampaignTypes[item.id] && setCampaignType(item.id)}>
                <div className={`${styles.typeIcon} ${styles[`typeIcon_${item.id}`]}`}><Icon /></div>
                <div><strong>{item.title}</strong><p>{item.description}</p></div>
              </button>
            );
          })}
        </div>
      </section>

      {campaignType !== "qr" ? (
        <DynamicCampaignBuilder type={campaignType} campaignId={editId} sponsorMode={sponsorMode} organizationId={sponsorOrganizationId} />
      ) : (
        <div className={styles.workspace}>
          <main className={styles.mainColumn}>
            <section className={styles.panel}>
              <div className={styles.sectionHeading}><div><span>Paso 2</span><h2>Información general</h2><p>Datos visibles para el usuario.</p></div><div className={styles.modeBadge}><QrCode /> Búsqueda QR</div></div>
              <div className={styles.formGrid}>
                <label><span>Nombre</span><input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Ej. Tesoro del estadio" /></label>
                <label><span>Patrocinador</span><input value={sponsor} readOnly={sponsorMode} onChange={(event) => setSponsor(event.target.value)} placeholder="Ej. Home Run Rewards" /></label>
                <label><span>Estado de la dinámica</span><select value={targetState} disabled={sponsorMode} onChange={(event) => setTargetState(event.target.value)}><option value="">Selecciona un estado</option>{MEXICO_STATES.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select></label>
                <label><span>Municipio (opcional)</span><select value={targetMunicipality} onChange={(event) => setTargetMunicipality(event.target.value)} disabled={!targetState}><option value="">Todo el estado</option>{municipalities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label><span>Fecha de inicio</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
                <label><span>Fecha de cierre</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
                <label className={styles.fullField}><span>Descripción</span><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe la dinámica que verá el usuario." /></label>
                <div className={`${styles.coverUploadWrap} ${styles.fullField}`}>
                  <label className={styles.uploadField}><ImagePlus /><div><strong>Imagen de portada</strong><span>PNG, JPG o WEBP</span></div><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverChange} /></label>
                  {coverPreview && <button type="button" className={styles.removeCoverButton} onClick={removeCover}><Trash2 /> Eliminar y cargar otra</button>}
                </div>
              </div>
            </section>

            <section className={`${styles.panel} ${styles.qrPanel}`}>
              <div className={styles.sectionHeading}><div><span>Paso 3</span><h2>Generador de códigos QR</h2><p>Los ganadores se distribuyen aleatoriamente.</p></div></div>
              <div className={styles.formGrid}>
                <label><span>Total de códigos</span><input type="number" min={1} value={totalCodes} onChange={(event) => setTotalCodes(Number(event.target.value))} /></label>
                <label><span>Códigos ganadores</span><input type="number" min={0} max={totalCodes} value={winnerCodes} onChange={(event) => setWinnerCodes(Number(event.target.value))} /></label>
                <label><span>Intentos por usuario</span><input type="number" min={1} value={attemptsPerUser} onChange={(event) => setAttemptsPerUser(Number(event.target.value))} /></label>
                <label><span>Premio o descuento</span><input value={reward} onChange={(event) => setReward(event.target.value)} /></label>
                <label><span>Vigencia del premio (días)</span><input type="number" min={1} max={365} value={rewardValidityDays} onChange={(event) => setRewardValidityDays(Math.max(1, Number(event.target.value) || 15))} /></label>
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
              <div className={styles.sectionHeading}><div><span>Paso 5</span><h2>Publicación</h2><p>{sponsorMode ? "Envía la campaña al administrador para su revisión." : "Guarda la campaña para probarla con el escáner."}</p></div></div>
              <div className={styles.formGrid}>
                <label><span>Estado</span><select value={sponsorMode ? "draft" : status} disabled={sponsorMode} onChange={(event) => setStatus(event.target.value as QrCampaignStatus)}><option value="draft">{sponsorMode ? "Se enviará a revisión" : "Borrador"}</option>{!sponsorMode && <option value="scheduled">Programada</option>}{!sponsorMode && <option value="active">Activa</option>}</select></label>
                <div className={styles.summaryCard}><Gift /><div><strong>{reward}</strong><span>{winnerCodes} ganadores · {totalCodes - winnerCodes} sin premio</span></div></div>
              </div>
              {notice && <div className={`${styles.notice} ${notice.toLowerCase().includes("guardada") ? styles.successToast : ""}`}><CheckCircle2 /><span>{notice}</span></div>}
              <div className={styles.footerActions}><a href="/usuario/cazar-recompensas/qr"><QrCode /> Abrir escáner</a><button type="button" className={styles.primaryButton} disabled={working || codes.length === 0} onClick={() => void saveCampaign()}><Save /> {sponsorMode ? "Enviar a aprobación" : "Guardar campaña"}</button></div>
            </section>
          </main>

          <aside className={styles.previewColumn}>
            <section className={styles.previewPanel}>
              <div className={styles.previewImage}>{coverPreview ? <img src={coverPreview} alt="Vista previa de la portada" /> : <QrCode />}</div>
              <div className={styles.previewContent}><span>Búsqueda QR</span><h2>{campaignName || "Nombre de campaña"}</h2><p>{description || "Aquí aparecerá la descripción de la campaña."}</p><div className={styles.previewMeta}><div><CalendarDays /><span>{startDate}</span></div><div><Gift /><span>{reward || "Premio por definir"}</span></div></div></div>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
