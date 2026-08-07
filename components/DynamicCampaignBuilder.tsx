"use client";

import {
  CheckCircle2,
  MapPin,
  Plus,
  Save,
  Store,
  Trash2,
  ImagePlus,
  Upload,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { readQuestions, type TriviaQuestion } from "@/lib/questions";
import {
  makeId,
  readDynamicCampaigns,
  saveDynamicCampaign,
  uploadDynamicCampaignCover,
  type BrandCampaign,
  type CampaignLocation,
  type DynamicCampaignStatus,
  type MapCampaign,
} from "@/lib/campaignDynamics";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { getStateCode, MEXICO_STATES } from "@/lib/mexicoCatalog";

const MapLocationPicker = dynamic(() => import("./MapLocationPicker"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 320, display: "grid", placeItems: "center", border: "1px solid #2d3138", borderRadius: 16 }}>Cargando mapa…</div>,
});
import styles from "./DynamicCampaignBuilder.module.css";

function newLocation(index: number): CampaignLocation {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : makeId("location"),
    name: `Premio ${index + 1}`,
    address: "",
    latitude: 19.432608,
    longitude: -99.133209,
    radius: 80,
    reward: "",
    rewardCode: "",
    points: 150,
    availableUnits: 1,
  };
}

export default function DynamicCampaignBuilder({
  type, campaignId = "", sponsorMode = false, organizationId = "",
}: {
  type: "map" | "brand"; campaignId?: string; sponsorMode?: boolean; organizationId?: string;
}) {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [editingId, setEditingId] = useState(campaignId);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [description, setDescription] = useState("");
  const [targetState, setTargetState] = useState("");
  const [targetMunicipality, setTargetMunicipality] = useState("");
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [reward, setReward] = useState("");
  const [rewardCode, setRewardCode] = useState("");
  const [rewardValidityDays, setRewardValidityDays] = useState(15);
  const [points, setPoints] = useState(150);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] =
    useState<DynamicCampaignStatus>("draft");
  const [locations, setLocations] = useState<CampaignLocation[]>([
    newLocation(0),
  ]);
  const [activeLocationId, setActiveLocationId] = useState(
    locations[0].id
  );
  const [questionCount, setQuestionCount] = useState(3);
  const [passing, setPassing] = useState(100);
  const [minimumTotal, setMinimumTotal] = useState(150);
  const [products, setProducts] = useState("");
  const [confidence, setConfidence] = useState(0.75);
  const [coverUrl, setCoverUrl] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);


  useEffect(() => {
    if (!campaignId) return;
    let active = true;
    void readDynamicCampaigns(type).then((items) => {
      const campaign = items.find((item) => item.id === campaignId);
      if (!active || !campaign) return;
      setEditingId(campaign.id); setName(campaign.name); setSponsor(campaign.sponsor); setDescription(campaign.description); setTargetState(campaign.targetState ?? ""); setTargetMunicipality(campaign.targetMunicipality ?? "");
      setReward(campaign.reward); setRewardCode(campaign.rewardCode); setRewardValidityDays(campaign.rewardValidityDays ?? 15); setPoints(campaign.points); setStartDate(campaign.startDate);
      setEndDate(campaign.endDate); setStatus(campaign.status); setSelected(campaign.selectedQuestionIds); setQuestionCount(campaign.questionCount);
      setPassing(campaign.passingPercentage); setLocations(campaign.locations); setActiveLocationId(campaign.locations[0]?.id ?? ""); setCoverUrl(campaign.coverUrl ?? "");
      if (campaign.type === "brand") { setMinimumTotal(campaign.minimumTotal); setProducts(campaign.requiredProducts.join(", ")); setConfidence(campaign.minimumConfidence); }
    }).catch((error) => setNotice(error instanceof Error ? error.message : "No se pudo cargar la campaña."));
    return () => { active = false; };
  }, [campaignId, type]);

  useEffect(() => {
    if (!sponsorMode || !organizationId) return;
    void supabase.from("sponsor_organizations").select("name,state").eq("id", organizationId).maybeSingle().then(({ data }) => {
      if (!data) return;
      setSponsor(String(data.name ?? ""));
      setTargetState(String(data.state ?? ""));
      setTargetMunicipality("");
    });
  }, [sponsorMode, organizationId]);

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
      }).catch(() => undefined);
    return () => controller.abort();
  }, [targetState]);

  useEffect(() => { void readQuestions().then(setQuestions).catch((error) => setNotice(error instanceof Error ? error.message : "No se pudieron cargar las preguntas.")); }, []);

  const visible = useMemo(
    () =>
      type === "brand"
        ? questions.filter(
            (question) =>
              question.category !== "marca" ||
              !question.brand ||
              question.brand.toLowerCase() === sponsor.toLowerCase()
          )
        : questions,
    [questions, type, sponsor]
  );

  const activeLocation =
    locations.find((item) => item.id === activeLocationId) ?? locations[0];

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function updateLocation(
    id: string,
    patch: Partial<CampaignLocation>
  ) {
    setLocations((current) =>
      current.map((location) =>
        location.id === id ? { ...location, ...patch } : location
      )
    );
  }


  function addLocation() {
    const location = newLocation(locations.length);
    setLocations((current) => [...current, location]);
    setActiveLocationId(location.id);
  }

  function removeLocation(id: string) {
    if (locations.length === 1) return;

    const next = locations.filter((location) => location.id !== id);
    setLocations(next);

    if (activeLocationId === id) {
      setActiveLocationId(next[0].id);
    }
  }

  async function selectCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    setNotice("");
    try {
      setCoverUrl(await uploadDynamicCampaignCover(file));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo cargar la portada.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function save() {
    if (!name.trim() || selected.length === 0) { setSaved(false); setNotice("Completa el nombre y selecciona al menos una pregunta."); return; }
    if (!targetState) { setSaved(false); setNotice("Selecciona el estado al que corresponde la campaña."); return; }
    if (!locations.length || locations.some((item) => !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude))) { setSaved(false); setNotice("Configura al menos una ubicación válida."); return; }
    setSaving(true); setSaved(false); setNotice("");
    try {
      const base = { id: editingId || makeId(type), name:name.trim(), sponsor:sponsor.trim(), description:description.trim(), coverUrl, targetState, targetMunicipality, reward:reward.trim(), rewardCode:rewardCode.trim(), rewardValidityDays, points, startDate, endDate, status: sponsorMode ? "draft" as const : status, selectedQuestionIds:selected, questionCount:Math.min(questionCount,selected.length), passingPercentage:passing, questionSeconds:5 as const, cooldownHours:24 as const, createdAt:new Date().toISOString() };
      const savedId = type === "map"
        ? await saveDynamicCampaign({ ...base, type:"map", locations } as MapCampaign)
        : await saveDynamicCampaign({ ...base, type:"brand", brandName:sponsor.trim(), locations, minimumTotal, requiredProducts:products.split(",").map(v=>v.trim()).filter(Boolean), minimumConfidence:confidence, maxTicketImages:3 } as BrandCampaign);
      if (sponsorMode) {
        if (!organizationId) throw new Error("No se encontró la organización del patrocinador.");
        const { data: existing, error: readError } = await supabase.from("campaign_sponsors").select("campaign_id").eq("campaign_id", savedId).eq("organization_id", organizationId).maybeSingle();
        if (readError) throw readError;
        const { error: linkError } = existing
          ? await supabase.from("campaign_sponsors").update({ approval_status: "in_review" }).eq("campaign_id", savedId).eq("organization_id", organizationId)
          : await supabase.from("campaign_sponsors").insert({ campaign_id: savedId, organization_id: organizationId, approval_status: "in_review" });
        if (linkError) throw linkError;
      }
      setEditingId(savedId); setSaved(true); setNotice(sponsorMode ? "Campaña enviada a aprobación correctamente." : `Campaña guardada correctamente con ${locations.length} ${locations.length===1?"ubicación":"ubicaciones"}.`);
      window.setTimeout(()=>{setNotice("");setSaved(false)},3800);
    } catch(error) { console.error("Error guardando campaña:",error); setSaved(false); setNotice(error instanceof Error ? error.message : "No se pudo guardar la campaña."); }
    finally { setSaving(false); }
  }

  return (
    <div className={styles.layout}>
      <section className={styles.panel}>
        <div className={styles.heading}>
          {type === "map" ? <MapPin /> : <Store />}

          <div>
            <span>
              {type === "map" ? "Recompensa en mapa" : "Visita a marca"}
            </span>

            <h2>Configuración operativa</h2>
          </div>
        </div>

        <div className={styles.grid}>
          <label>
            Nombre
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la campaña" />
          </label>

          <label>
            Patrocinador / marca
            <input
              value={sponsor}
              readOnly={sponsorMode}
              placeholder="Marca o patrocinador"
              onChange={(event) => setSponsor(event.target.value)}
            />
          </label>

          <label>
            Estado de la dinámica
            <select value={targetState} disabled={sponsorMode} onChange={(event) => setTargetState(event.target.value)}>
              <option value="">Selecciona un estado</option>
              {MEXICO_STATES.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
            </select>
          </label>

          <label>
            Municipio (opcional)
            <select value={targetMunicipality} disabled={!targetState} onChange={(event) => setTargetMunicipality(event.target.value)}>
              <option value="">Todo el estado</option>
              {municipalities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <div className={`${styles.full} ${styles.coverUploader}`}>
            <div className={styles.coverUploaderHeading}>
              <div><strong>Portada de la campaña</strong><span>Se mostrará en las tarjetas del administrador y del usuario.</span></div>
              <label className={styles.coverUploadButton}><Upload />{uploadingCover ? "Comprimiendo…" : coverUrl ? "Cambiar portada" : "Subir portada"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectCover} disabled={uploadingCover} /></label>
            </div>
            {coverUrl ? <div className={styles.coverPreview}><img src={coverUrl} alt="Portada de la campaña"/><button type="button" onClick={()=>setCoverUrl("")}><Trash2/>Eliminar</button></div> : <div className={styles.coverEmpty}><ImagePlus/><span>La imagen se comprime automáticamente a WebP.</span></div>}
          </div>

          <label className={styles.full}>
            Descripción
            <textarea
              value={description}
              placeholder="Describe la dinámica"
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </label>

          <label>
            Premio predeterminado
            <input
              value={reward}
              onChange={(event) => setReward(event.target.value)}
            />
          </label>

          <label>
            Código predeterminado
            <input
              value={rewardCode}
              onChange={(event) => setRewardCode(event.target.value)}
            />
          </label>

          <label>
            Vigencia del premio (días)
            <input
              type="number"
              min={1}
              max={365}
              value={rewardValidityDays}
              onChange={(event) => setRewardValidityDays(Math.max(1, Number(event.target.value) || 15))}
            />
          </label>

          <label>
            Puntos predeterminados
            <input
              type="number"
              value={points}
              onChange={(event) => setPoints(Number(event.target.value))}
            />
          </label>

          <label>
            Estado
            <select
              value={sponsorMode ? "draft" : status}
              disabled={sponsorMode}
              onChange={(event) =>
                setStatus(event.target.value as DynamicCampaignStatus)
              }
            >
              <option value="draft">Borrador</option>
              <option value="scheduled">Programada</option>
              <option value="active">Activa</option>
              <option value="finished">Finalizada</option>
            </select>
          </label>

          <label>
            Inicio
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label>
            Cierre
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <label>
            Preguntas por partida
            <input
              type="number"
              min={1}
              max={selected.length || 1}
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
            />
          </label>

          <label>
            Porcentaje mínimo
            <input
              type="number"
              min={1}
              max={100}
              value={passing}
              onChange={(event) => setPassing(Number(event.target.value))}
            />
          </label>

          {type === "brand" && (
            <>
              <label>
                Total mínimo
                <input
                  type="number"
                  value={minimumTotal}
                  onChange={(event) => setMinimumTotal(Number(event.target.value))}
                />
              </label>

              <label>
                Confianza mínima
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={confidence}
                  onChange={(event) => setConfidence(Number(event.target.value))}
                />
              </label>

              <label className={styles.full}>
                Productos requeridos (separados por coma)
                <input
                  value={products}
                  onChange={(event) => setProducts(event.target.value)}
                />
              </label>
            </>
          )}
        </div>

        <div className={styles.locationHeader}>
          <div>
            <span>Ubicaciones y premios</span>
            <h3>
              {locations.length}{" "}
              {locations.length === 1
                ? "premio configurado"
                : "premios configurados"}
            </h3>
          </div>

          <button type="button" onClick={addLocation}>
            <Plus />
            Agregar ubicación
          </button>
        </div>

        <div className={styles.locationTabs}>
          {locations.map((location, index) => (
            <button
              key={location.id}
              type="button"
              className={
                location.id === activeLocationId ? styles.activeLocation : ""
              }
              onClick={() => setActiveLocationId(location.id)}
            >
              <MapPin />
              {index + 1}. {location.name}
            </button>
          ))}
        </div>

        {activeLocation && (
          <div className={styles.locationEditor}>
            <div className={styles.grid}>
              <label>
                Nombre de la ubicación
                <input
                  value={activeLocation.name}
                  onChange={(event) =>
                    updateLocation(activeLocation.id, {
                      name: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Dirección
                <input
                  value={activeLocation.address}
                  onChange={(event) =>
                    updateLocation(activeLocation.id, {
                      address: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Radio permitido (m)
                <input
                  type="number"
                  value={activeLocation.radius}
                  onChange={(event) =>
                    updateLocation(activeLocation.id, {
                      radius: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label>
                Unidades en esta ubicación
                <input
                  type="number"
                  min="1"
                  value={activeLocation.availableUnits}
                  onChange={(event) =>
                    updateLocation(activeLocation.id, {
                      availableUnits: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label>
                Premio
                <input
                  value={activeLocation.reward}
                  onChange={(event) =>
                    updateLocation(activeLocation.id, {
                      reward: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Código
                <input
                  value={activeLocation.rewardCode}
                  onChange={(event) =>
                    updateLocation(activeLocation.id, {
                      rewardCode: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Puntos
                <input
                  type="number"
                  value={activeLocation.points}
                  onChange={(event) =>
                    updateLocation(activeLocation.id, {
                      points: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label>
                Latitud
                <input
                  type="number"
                  step="any"
                  value={activeLocation.latitude}
                  onChange={(event) =>
                    updateLocation(activeLocation.id, {
                      latitude: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label>
                Longitud
                <input
                  type="number"
                  step="any"
                  value={activeLocation.longitude}
                  onChange={(event) =>
                    updateLocation(activeLocation.id, {
                      longitude: Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>

            {locations.length > 1 && (
              <button
                type="button"
                className={styles.removeLocation}
                onClick={() => removeLocation(activeLocation.id)}
              >
                <Trash2 />
                Eliminar esta ubicación
              </button>
            )}
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.heading}>
          <CheckCircle2 />

          <div>
            <span>Banco administrable</span>
            <h2>Selecciona preguntas</h2>
          </div>
        </div>

        <p className={styles.helper}>
          Las preguntas vienen de /admin/preguntas. Las de marca se filtran
          por el patrocinador escrito.
        </p>

        <div className={styles.questions}>
          {visible.map((question) => (
            <label
              key={question.id}
              className={selected.includes(question.id) ? styles.selected : ""}
            >
              <input
                type="checkbox"
                checked={selected.includes(question.id)}
                onChange={() => toggle(question.id)}
              />

              <div>
                <strong>{question.text}</strong>
                <span>
                  {question.category}
                  {question.brand ? ` · ${question.brand}` : ""}
                </span>
              </div>
            </label>
          ))}
        </div>
      </section>

      {activeLocation && (
        <section className={`${styles.panel} ${styles.mapPanel}`}>
          <div className={styles.heading}>
            <MapPin />

            <div>
              <span>Ubicación seleccionada</span>
              <h2>Coloca el premio en el mapa</h2>
            </div>
          </div>

          <p className={styles.helper}>
            Estás configurando: <strong>{activeLocation.name}</strong>. Busca
            una dirección o mueve el marcador.
          </p>

          <MapLocationPicker
            key={activeLocation.id}
            latitude={activeLocation.latitude}
            longitude={activeLocation.longitude}
            onChange={(latitude, longitude, label) =>
              updateLocation(activeLocation.id, {
                latitude,
                longitude,
                ...(label ? { address: label } : {}),
              })
            }
          />
        </section>
      )}

      <section className={`${styles.panel} ${styles.finalActions}`}>
        {notice && <p className={`${styles.notice} ${saved ? styles.successToast : styles.errorToast}`}>{notice}</p>}
        <button className={styles.save} type="button" disabled={saving} onClick={() => void save()}>
          <Save />
          {saving ? "Guardando..." : "Guardar campaña"}
        </button>
      </section>
    </div>
  );
}
