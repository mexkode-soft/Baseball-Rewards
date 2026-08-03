"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, MapPin, QrCode, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import styles from "../../SponsorDashboard.module.css";

type CampaignType = "brand" | "qr" | "map";
type PlanCode = "basic" | "intermediate" | "premium";
type PlanInfo = {
  code: PlanCode;
  name: string;
  allows_ticket: boolean;
  allows_qr: boolean;
  allows_map: boolean;
  max_active_campaigns: number | null;
};
type LocationDraft = { name: string; address: string; latitude: string; longitude: string; radius: string; reward: string; rewardCode: string; points: string; units: string };

const typeOptions = [
  { id: "brand" as const, title: "Ticket de compra", description: "El usuario carga su ticket y la IA valida comercio, monto y reglas.", icon: Store, plan: "Básico" },
  { id: "qr" as const, title: "Códigos QR", description: "Genera códigos únicos, ganadores y de participación para una activación.", icon: QrCode, plan: "Intermedio" },
  { id: "map" as const, title: "Premios en mapa", description: "Coloca recompensas en ubicaciones con radio y unidades disponibles.", icon: MapPin, plan: "Premium" },
];

const emptyLocation = (): LocationDraft => ({ name: "", address: "", latitude: "", longitude: "", radius: "80", reward: "", rewardCode: "", points: "100", units: "1" });

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function NewCampaign() {
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [campaignType, setCampaignType] = useState<CampaignType>("brand");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [minimum, setMinimum] = useState("300");
  const [requiredProducts, setRequiredProducts] = useState("");
  const [confidence, setConfidence] = useState("80");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [media, setMedia] = useState("0");
  const [rewards, setRewards] = useState("0");
  const [margin, setMargin] = useState("30");
  const [totalCodes, setTotalCodes] = useState("20");
  const [winnerCodes, setWinnerCodes] = useState("3");
  const [attempts, setAttempts] = useState("5");
  const [participationPoints, setParticipationPoints] = useState("10");
  const [winnerPoints, setWinnerPoints] = useState("100");
  const [qrReward, setQrReward] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [locations, setLocations] = useState<LocationDraft[]>([emptyLocation()]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: member, error } = await supabase
        .from("sponsor_members")
        .select("organization_id,sponsor_organizations(id,name,plan_code)")
        .limit(1)
        .maybeSingle();
      if (error || !member?.organization_id) return setMessage(error?.message ?? "No se encontró la organización del patrocinador.");
      const organization = Array.isArray(member.sponsor_organizations) ? member.sponsor_organizations[0] : member.sponsor_organizations;
      const planCode = (organization?.plan_code ?? "basic") as PlanCode;
      setOrgId(member.organization_id);
      setOrganizationName(organization?.name ?? "");
      setBrand(organization?.name ?? "");
      const { data: planData } = await supabase.from("subscription_plans").select("code,name,allows_ticket,allows_qr,allows_map,max_active_campaigns").eq("code", planCode).maybeSingle();
      if (planData) setPlan(planData as PlanInfo);
    })();
  }, []);

  const allowed = useMemo(() => ({
    brand: plan?.allows_ticket ?? false,
    qr: plan?.allows_qr ?? false,
    map: plan?.allows_map ?? false,
  }), [plan]);

  function selectType(type: CampaignType) {
    if (!allowed[type]) return;
    setCampaignType(type);
    setMessage("");
  }

  function updateLocation(index: number, field: keyof LocationDraft, value: string) {
    setLocations((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!allowed[campaignType]) return setMessage("Tu plan actual no permite crear esta modalidad.");
    setSaving(true);
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !orgId) throw new Error("No se encontró la organización del patrocinador.");
      if (!start || !end) throw new Error("Selecciona la fecha inicial y final.");
      if (new Date(end) < new Date(start)) throw new Error("La fecha final no puede ser anterior a la inicial.");

      const startsAt = new Date(`${start}T00:00:00`).toISOString();
      const endsAt = new Date(`${end}T23:59:59`).toISOString();
      const participationLimit = campaignType === "qr" ? Math.max(1, Number(attempts)) : 5;
      const successPoints = campaignType === "qr" ? Math.max(0, Number(winnerPoints)) : 100;

      const { data: campaign, error } = await supabase.from("campaigns").insert({
        type: campaignType,
        name: name.trim(),
        sponsor: brand.trim(),
        description: description.trim(),
        status: "draft",
        starts_at: startsAt,
        ends_at: endsAt,
        participation_limit: participationLimit,
        points_on_success: successPoints,
        created_by: user.id,
        metadata: { createdBySponsor: true, requestedModality: campaignType, planCode: plan?.code ?? "basic" },
      }).select("id").single();
      if (error) throw error;

      const { error: linkError } = await supabase.from("campaign_sponsors").insert({ campaign_id: campaign.id, organization_id: orgId, approval_status: "in_review" });
      if (linkError) throw linkError;

      const { error: budgetError } = await supabase.from("campaign_budgets").insert({
        campaign_id: campaign.id,
        media_budget: Number(media),
        rewards_budget: Number(rewards),
        estimated_margin_percentage: Number(margin),
      });
      if (budgetError) throw budgetError;

      if (campaignType === "brand") {
        const products = requiredProducts.split(",").map((item) => item.trim()).filter(Boolean);
        const { error: ruleError } = await supabase.from("brand_rules").insert({
          campaign_id: campaign.id,
          expected_brand: brand.trim(),
          minimum_total: Number(minimum),
          required_products: products,
          confidence_threshold: Math.min(1, Math.max(0, Number(confidence) / 100)),
          automatic_approval: false,
        });
        if (ruleError) throw ruleError;
      }

      if (campaignType === "qr") {
        const total = Math.max(1, Math.min(500, Number(totalCodes)));
        const winners = Math.max(0, Math.min(total, Number(winnerCodes)));
        const records = await Promise.all(Array.from({ length: total }, async (_, index) => {
          const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
          const isWinner = index < winners;
          return {
            campaign_id: campaign.id,
            token_hash: await sha256(token),
            token_value: token,
            display_code: `QR-${String(index + 1).padStart(4, "0")}`,
            is_winner: isWinner,
            reward_name: isWinner ? (qrReward.trim() || "Premio") : null,
            reward_code: isWinner ? `HRR-${String(index + 1).padStart(4, "0")}` : null,
            points: isWinner ? Math.max(0, Number(winnerPoints)) : Math.max(0, Number(participationPoints)),
            max_uses: Math.max(1, Number(maxUses)),
          };
        }));
        const { error: qrError } = await supabase.from("qr_codes").insert(records);
        if (qrError) throw qrError;
      }

      if (campaignType === "map") {
        if (!locations.length || locations.some((item) => !item.name.trim() || !item.latitude || !item.longitude || !item.reward.trim())) {
          throw new Error("Completa nombre, coordenadas y premio de todas las ubicaciones.");
        }
        const { error: locationError } = await supabase.from("campaign_locations").insert(locations.map((item) => ({
          campaign_id: campaign.id,
          name: item.name.trim(),
          address: item.address.trim(),
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          radius_meters: Math.max(10, Number(item.radius)),
          reward_name: item.reward.trim(),
          reward_code: item.rewardCode.trim() || null,
          reward_units: Math.max(1, Number(item.units)),
          points: Math.max(0, Number(item.points)),
          is_active: false,
        })));
        if (locationError) throw locationError;
      }

      router.push("/patrocinador/campanas");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible crear la campaña.");
    } finally {
      setSaving(false);
    }
  }

  return <div className={styles.page}>
    <div className={styles.heading}><div><h1>Nueva campaña</h1><p>Selecciona la modalidad permitida por tu plan y envíala a revisión administrativa.</p></div></div>

    <section className={styles.panel} style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <div><small style={{ color: "#aeb5c1" }}>Organización</small><strong style={{ display: "block", marginTop: 4 }}>{organizationName || "Cargando..."}</strong></div>
      <div><small style={{ color: "#aeb5c1" }}>Plan actual</small><span className={styles.badge} style={{ display: "flex", marginTop: 5 }}>{plan?.name ?? "Cargando..."}</span></div>
      <div><small style={{ color: "#aeb5c1" }}>Modalidades</small><strong style={{ display: "block", marginTop: 4 }}>{plan ? [plan.allows_ticket && "Ticket", plan.allows_qr && "QR", plan.allows_map && "Mapa"].filter(Boolean).join(" · ") : "—"}</strong></div>
    </section>

    <section>
      <div style={{ marginBottom: 12 }}><strong>Paso 1 · Elige la modalidad</strong><p style={{ color: "#aeb5c1", margin: "6px 0 0" }}>Las opciones bloqueadas requieren un plan superior.</p></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {typeOptions.map((option) => {
          const Icon = option.icon;
          const enabled = allowed[option.id];
          const selected = campaignType === option.id;
          return <button key={option.id} type="button" onClick={() => selectType(option.id)} disabled={!enabled} style={{ textAlign: "left", borderRadius: 18, padding: 18, border: selected ? "2px solid #e2b84f" : "1px solid #30343c", background: selected ? "#201b10" : "#101318", color: "white", opacity: enabled ? 1 : .55, cursor: enabled ? "pointer" : "not-allowed" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><Icon size={26} color="#e2b84f" />{!enabled ? <LockKeyhole size={18} /> : null}</div>
            <strong style={{ display: "block", marginTop: 14, fontSize: "1.05rem" }}>{option.title}</strong>
            <p style={{ color: "#aeb5c1", margin: "8px 0 12px", minHeight: 48 }}>{option.description}</p>
            <small>{enabled ? (selected ? "Seleccionada" : "Disponible") : `Disponible desde plan ${option.plan}`}</small>
          </button>;
        })}
      </div>
    </section>

    <form className={styles.panel} onSubmit={submit} style={{ display: "grid", gap: 16, maxWidth: 920 }}>
      <div><strong>Paso 2 · Configura {campaignType === "brand" ? "la campaña por ticket" : campaignType === "qr" ? "los códigos QR" : "las ubicaciones del mapa"}</strong></div>
      <label>Nombre de la campaña<input required value={name} onChange={(event) => setName(event.target.value)} style={input} /></label>
      <label>Marca o comercio<input required value={brand} onChange={(event) => setBrand(event.target.value)} style={input} /></label>
      <label>Descripción<textarea required value={description} onChange={(event) => setDescription(event.target.value)} rows={4} style={input} /></label>

      {campaignType === "brand" ? <>
        <div style={responsiveGrid}>
          <label>Compra mínima<input required type="number" min="0" value={minimum} onChange={(event) => setMinimum(event.target.value)} style={input} /></label>
          <label>Confianza mínima IA %<input type="number" min="1" max="100" value={confidence} onChange={(event) => setConfidence(event.target.value)} style={input} /></label>
        </div>
        <label>Productos requeridos <small style={{ color: "#aeb5c1" }}>(separados por coma, opcional)</small><input value={requiredProducts} onChange={(event) => setRequiredProducts(event.target.value)} style={input} placeholder="Combo familiar, hamburguesa, refresco" /></label>
      </> : null}

      {campaignType === "qr" ? <>
        <div style={responsiveGrid}>
          <label>Total de códigos<input type="number" min="1" max="500" value={totalCodes} onChange={(event) => setTotalCodes(event.target.value)} style={input} /></label>
          <label>Códigos ganadores<input type="number" min="0" value={winnerCodes} onChange={(event) => setWinnerCodes(event.target.value)} style={input} /></label>
          <label>Intentos por usuario<input type="number" min="1" value={attempts} onChange={(event) => setAttempts(event.target.value)} style={input} /></label>
          <label>Usos máximos por QR<input type="number" min="1" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} style={input} /></label>
          <label>Puntos por participar<input type="number" min="0" value={participationPoints} onChange={(event) => setParticipationPoints(event.target.value)} style={input} /></label>
          <label>Puntos si gana<input type="number" min="0" value={winnerPoints} onChange={(event) => setWinnerPoints(event.target.value)} style={input} /></label>
        </div>
        <label>Premio de los QR ganadores<input required value={qrReward} onChange={(event) => setQrReward(event.target.value)} style={input} /></label>
      </> : null}

      {campaignType === "map" ? <div style={{ display: "grid", gap: 14 }}>
        {locations.map((location, index) => <section key={index} style={{ border: "1px solid #30343c", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>Ubicación {index + 1}</strong>{locations.length > 1 ? <button type="button" onClick={() => setLocations((items) => items.filter((_, itemIndex) => itemIndex !== index))} style={smallButton}>Eliminar</button> : null}</div>
          <div style={responsiveGrid}><label>Nombre<input value={location.name} onChange={(event) => updateLocation(index, "name", event.target.value)} style={input} /></label><label>Dirección<input value={location.address} onChange={(event) => updateLocation(index, "address", event.target.value)} style={input} /></label></div>
          <div style={responsiveGrid}><label>Latitud<input type="number" step="any" value={location.latitude} onChange={(event) => updateLocation(index, "latitude", event.target.value)} style={input} /></label><label>Longitud<input type="number" step="any" value={location.longitude} onChange={(event) => updateLocation(index, "longitude", event.target.value)} style={input} /></label><label>Radio en metros<input type="number" min="10" value={location.radius} onChange={(event) => updateLocation(index, "radius", event.target.value)} style={input} /></label></div>
          <div style={responsiveGrid}><label>Premio<input value={location.reward} onChange={(event) => updateLocation(index, "reward", event.target.value)} style={input} /></label><label>Código de premio<input value={location.rewardCode} onChange={(event) => updateLocation(index, "rewardCode", event.target.value)} style={input} /></label><label>Unidades<input type="number" min="1" value={location.units} onChange={(event) => updateLocation(index, "units", event.target.value)} style={input} /></label><label>Puntos<input type="number" min="0" value={location.points} onChange={(event) => updateLocation(index, "points", event.target.value)} style={input} /></label></div>
        </section>)}
        <button type="button" onClick={() => setLocations((items) => [...items, emptyLocation()])} style={{ ...smallButton, justifySelf: "start" }}>+ Agregar ubicación</button>
      </div> : null}

      <div style={responsiveGrid}><label>Fecha inicial<input required type="date" value={start} onChange={(event) => setStart(event.target.value)} style={input} /></label><label>Fecha final<input required type="date" value={end} onChange={(event) => setEnd(event.target.value)} style={input} /></label></div>
      <div style={responsiveGrid}><label>Inversión en medios<input type="number" min="0" value={media} onChange={(event) => setMedia(event.target.value)} style={input} /></label><label>Presupuesto de premios<input type="number" min="0" value={rewards} onChange={(event) => setRewards(event.target.value)} style={input} /></label><label>Margen estimado %<input type="number" min="0" max="100" value={margin} onChange={(event) => setMargin(event.target.value)} style={input} /></label></div>
      {message ? <p style={{ color: "#ff9b9b" }}>{message}</p> : null}
      <button className={styles.button} type="submit" disabled={saving || !plan} style={{ border: 0, justifySelf: "start", cursor: "pointer" }}>{saving ? "Guardando..." : "Enviar a revisión"}</button>
    </form>
  </div>;
}

const input = { display: "block", width: "100%", marginTop: 7, boxSizing: "border-box" as const, border: "1px solid #30343c", borderRadius: 12, padding: "12px 13px", background: "#0b0d10", color: "white", font: "inherit" };
const responsiveGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 };
const smallButton = { border: "1px solid #3b4049", borderRadius: 10, padding: "8px 11px", background: "#171a20", color: "white", cursor: "pointer" };
