"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DEMO_CONFIG_EVENT, readDemoConfig } from "@/lib/demoConfig";
import styles from "@/app/patrocinador/SponsorDashboard.module.css";

type Campaign = { id: string; name: string; status: string; sponsor: string | null; starts_at: string | null; ends_at: string | null };
type Metric = { metric_date: string; ticket_uploads: number; valid_tickets: number; rejected_tickets: number; unique_participants: number; attributed_sales: number; rewards_won: number; rewards_redeemed: number; points_awarded: number };
type Budget = { media_budget: number; rewards_budget: number; other_costs: number; estimated_margin_percentage: number };

const money = (value: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);

export default function AdminCampaignMetricsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState("");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    let active = true;
    const refreshDemo = () => {
      void readDemoConfig()
        .then((config) => { if (active) setDemoEnabled(config.simulatedLocationEnabled); })
        .catch(() => { if (active) setDemoEnabled(false); });
    };
    void loadCampaigns();
    refreshDemo();
    window.addEventListener(DEMO_CONFIG_EVENT, refreshDemo);
    return () => { active = false; window.removeEventListener(DEMO_CONFIG_EVENT, refreshDemo); };
  }, []);
  useEffect(() => { if (selected) void loadMetrics(selected, demoEnabled); }, [selected, demoEnabled]);

  async function loadCampaigns() {
    setLoading(true);
    const { data, error } = await supabase.from("campaigns").select("id,name,status,sponsor,starts_at,ends_at").order("created_at", { ascending: false });
    if (error) { setMessage(error.message); setLoading(false); return; }
    const list = (data ?? []) as Campaign[];
    setCampaigns(list);
    if (list[0]) setSelected(list[0].id); else setLoading(false);
  }

  async function simulateMetrics() {
    if (!selected || simulating) return;
    setSimulating(true); setMessage("");
    try {
      const { error } = await supabase.rpc("simular_metricas_campana", { p_campaign_id: selected });
      if (error) throw error;
      setMessage("Métricas demo generadas para los últimos 30 días.");
      await loadMetrics(selected, true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron simular las métricas.");
    } finally { setSimulating(false); }
  }

  async function loadMetrics(id: string, useDemo = demoEnabled) {
    setLoading(true); setMessage("");
    const metricTable = useDemo ? "campaign_metrics_demo_daily" : "campaign_metrics_daily";
    const [{ data: metricRows, error: metricError }, { data: budgetRow, error: budgetError }] = await Promise.all([
      supabase.from(metricTable).select("*").eq("campaign_id", id).order("metric_date"),
      supabase.from("campaign_budgets").select("*").eq("campaign_id", id).maybeSingle(),
    ]);
    if (metricError || budgetError) setMessage(metricError?.message ?? budgetError?.message ?? "No se pudieron cargar las métricas.");
    setMetrics((metricRows ?? []) as Metric[]);
    setBudget((budgetRow ?? null) as Budget | null);
    setLoading(false);
  }

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selected);
  const summary = useMemo(() => {
    const sales = metrics.reduce((total, row) => total + Number(row.attributed_sales), 0);
    const valid = metrics.reduce((total, row) => total + Number(row.valid_tickets), 0);
    const uploads = metrics.reduce((total, row) => total + Number(row.ticket_uploads), 0);
    const participants = metrics.reduce((total, row) => total + Number(row.unique_participants), 0);
    const rewards = metrics.reduce((total, row) => total + Number(row.rewards_won), 0);
    const realCost = Number(budget?.media_budget ?? 0) + Number(budget?.rewards_budget ?? 0) + Number(budget?.other_costs ?? 0);
    // La simulación usa una inversión de referencia solamente mientras el modo demo está activo.
    // En operación normal ROAS y ROI se calculan exclusivamente con presupuesto y métricas reales.
    const cost = realCost > 0 ? realCost : (demoEnabled && metrics.length ? 80000 : 0);
    const ticketAvg = valid ? sales / valid : 0;
    const roas = cost ? sales / cost : 0;
    const configuredMargin = Number(budget?.estimated_margin_percentage ?? 0) / 100;
    const margin = configuredMargin > 0 ? configuredMargin : (demoEnabled ? 0.35 : 0);
    const roi = cost ? ((sales * margin - cost) / cost) * 100 : 0;
    return { sales, valid, uploads, participants, rewards, cost, ticketAvg, roas, roi };
  }, [metrics, budget]);

  const maxSales = Math.max(1, ...metrics.map((row) => Number(row.attributed_sales)));
  const width = 760, height = 270, pad = 42;
  const points = metrics.map((row, index) => ({
    x: pad + (index / Math.max(1, metrics.length - 1)) * (width - pad * 2),
    y: height - pad - (Number(row.attributed_sales) / maxSales) * (height - pad * 2),
    row,
  }));
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const funnel = [
    { label: "Tickets cargados", value: summary.uploads },
    { label: "Tickets válidos", value: summary.valid },
    { label: "Participantes", value: summary.participants },
    { label: "Premios ganados", value: summary.rewards },
  ];
  const funnelMax = Math.max(1, ...funnel.map((item) => item.value));

  return <div className={styles.page}>
    <div className={styles.heading}>
      <div><h1>Métricas por campaña</h1><p>Consulta ventas atribuidas, participación, inversión y retorno de cualquier campaña.</p></div>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
        <select className={styles.select} value={selected} onChange={(event) => setSelected(event.target.value)}>
          {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}{campaign.sponsor ? ` · ${campaign.sponsor}` : ""}</option>)}
        </select>
        {demoEnabled && selected ? <button type="button" onClick={() => void simulateMetrics()} disabled={simulating} style={{border:"1px solid rgba(227,185,86,.45)",borderRadius:12,background:"rgba(227,185,86,.12)",color:"#f1c85e",padding:"12px 15px",fontWeight:800,cursor:"pointer"}}>{simulating ? "Simulando…" : "Simular métricas (30 días)"}</button> : null}
      </div>
    </div>
    {message ? <p style={{ color: "#ff9d9d" }}>{message}</p> : null}
    {!campaigns.length && !loading ? <div className={styles.panel}><div className={styles.empty}>Aún no existen campañas para analizar.</div></div> : <>
      {demoEnabled ? <div style={{marginBottom:14,padding:"10px 13px",border:"1px solid rgba(227,185,86,.28)",borderRadius:12,background:"rgba(227,185,86,.07)",color:"#e8c66c",fontWeight:800,fontSize:12}}>Modo demo activo · las cifras mostradas son simuladas y desaparecen al desactivar la ubicación simulada.</div> : null}
      <section className={styles.metrics}>
        <div className={styles.metric}><span>Ventas atribuidas</span><strong>{money(summary.sales)}</strong><small>{selectedCampaign?.name ?? "Campaña"}</small></div>
        <div className={styles.metric}><span>ROAS atribuido</span><strong>{summary.roas.toFixed(2)}x</strong><small>Ventas ÷ inversión</small></div>
        <div className={styles.metric}><span>Ticket promedio</span><strong>{money(summary.ticketAvg)}</strong><small>{summary.valid} tickets válidos</small></div>
        <div className={styles.metric}><span>ROI estimado</span><strong>{summary.roi.toFixed(1)}%</strong><small>Con margen estimado</small></div>
      </section>
      <section className={styles.charts}>
        <article className={styles.panel}><h2>Ventas atribuidas en el tiempo</h2><p>Monto diario validado a partir de tickets de compra.</p><svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfica de ventas atribuidas por día"><defs><linearGradient id="adminSalesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e3b956" stopOpacity=".35"/><stop offset="1" stopColor="#e3b956" stopOpacity="0"/></linearGradient></defs>{[0,1,2,3,4].map((index) => <line key={index} className={styles.gridLine} x1={pad} x2={width-pad} y1={pad+index*(height-pad*2)/4} y2={pad+index*(height-pad*2)/4}/>)}{points.length > 1 ? <><path className={styles.area} d={`${path} L${points.at(-1)!.x},${height-pad} L${points[0].x},${height-pad} Z`}/><path className={styles.line} d={path}/>{points.map((point,index) => <circle key={index} className={styles.dot} cx={point.x} cy={point.y} r="4"><title>{point.row.metric_date}: {money(Number(point.row.attributed_sales))}</title></circle>)}</> : null}</svg></article>
        <article className={styles.panel}><h2>Embudo de participación</h2><p>De la carga del ticket hasta la entrega de premios.</p><div className={styles.bars}>{funnel.map((item) => <div className={styles.barRow} key={item.label}><span>{item.label}</span><div className={styles.track}><div className={styles.fill} style={{ width: `${Math.max(4, item.value / funnelMax * 100)}%` }}/></div><strong>{item.value}</strong></div>)}</div></article>
      </section>
      <article className={styles.panel}><h2>Detalle diario</h2><p>Resultados registrados para la campaña seleccionada.</p><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Fecha</th><th>Ventas</th><th>Tickets válidos</th><th>Rechazados</th><th>Participantes</th><th>Premios</th></tr></thead><tbody>{[...metrics].reverse().map((row) => <tr key={row.metric_date}><td>{new Date(`${row.metric_date}T12:00:00`).toLocaleDateString("es-MX")}</td><td>{money(Number(row.attributed_sales))}</td><td>{row.valid_tickets}</td><td>{row.rejected_tickets}</td><td>{row.unique_participants}</td><td>{row.rewards_won}</td></tr>)}</tbody></table></div></article>
    </>}
  </div>;
}
