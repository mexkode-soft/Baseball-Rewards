"use client";

import {
  CheckCircle2,
  MapPin,
  Plus,
  Save,
  Store,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readQuestions, type TriviaQuestion } from "@/lib/questions";
import {
  makeId,
  saveDynamicCampaign,
  type BrandCampaign,
  type CampaignLocation,
  type DynamicCampaignStatus,
  type MapCampaign,
} from "@/lib/campaignDynamics";
import MapLocationPicker from "./MapLocationPicker";
import styles from "./DynamicCampaignBuilder.module.css";

function newLocation(index: number): CampaignLocation {
  return {
    id: makeId("location"),
    name: `Premio ${index + 1}`,
    address: "Ubicación pendiente",
    latitude: 19.432608,
    longitude: -99.133209,
    radius: 80,
    reward: "20% de descuento",
    rewardCode: `HOME${20 + index}`,
    points: 150,
    availableUnits: 1,
  };
}

export default function DynamicCampaignBuilder({
  type,
}: {
  type: "map" | "brand";
}) {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState(
    type === "map" ? "Pelotas doradas" : "Compra y gana"
  );
  const [sponsor, setSponsor] = useState(
    type === "map" ? "Home Run Rewards" : "Burger King"
  );
  const [description, setDescription] = useState(
    type === "map"
      ? "Elige un premio, acércate a su ubicación y supera el reto."
      : "Sube tu ticket, valida tu ubicación y acumula puntos."
  );
  const [reward, setReward] = useState(
    type === "map" ? "20% de descuento" : "150 puntos y cupón especial"
  );
  const [rewardCode, setRewardCode] = useState(
    type === "map" ? "HOME20" : "MARCA150"
  );
  const [points, setPoints] = useState(150);
  const [startDate, setStartDate] = useState("2026-08-02");
  const [endDate, setEndDate] = useState("2026-08-31");
  const [status, setStatus] =
    useState<DynamicCampaignStatus>("active");
  const [locations, setLocations] = useState<CampaignLocation[]>([
    newLocation(0),
  ]);
  const [activeLocationId, setActiveLocationId] = useState(
    locations[0].id
  );
  const [questionCount, setQuestionCount] = useState(3);
  const [passing, setPassing] = useState(100);
  const [minimumTotal, setMinimumTotal] = useState(150);
  const [products, setProducts] = useState("Combo participante");
  const [confidence, setConfidence] = useState(0.75);

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

  function setPrizeCount(value: number) {
    const count = Math.max(1, Math.min(30, Math.floor(value || 1)));

    setLocations((current) => {
      if (current.length === count) return current;
      if (current.length > count) return current.slice(0, count);

      return [
        ...current,
        ...Array.from(
          { length: count - current.length },
          (_, index) => newLocation(current.length + index)
        ),
      ];
    });
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

  async function save() {
    if (!name.trim() || selected.length === 0) {
      setNotice("Completa el nombre y selecciona al menos una pregunta.");
      return;
    }

    const base = {
      id: makeId(type),
      name: name.trim(),
      sponsor: sponsor.trim(),
      description: description.trim(),
      reward: reward.trim(),
      rewardCode: rewardCode.trim(),
      points,
      startDate,
      endDate,
      status,
      selectedQuestionIds: selected,
      questionCount: Math.min(questionCount, selected.length),
      passingPercentage: passing,
      questionSeconds: 5 as const,
      cooldownHours: 24 as const,
      createdAt: new Date().toISOString(),
    };

    if (type === "map") {
      await saveDynamicCampaign({
        ...base,
        type: "map",
        locations,
      } as MapCampaign);
    } else {
      await saveDynamicCampaign({
        ...base,
        type: "brand",
        brandName: sponsor,
        locations,
        minimumTotal,
        requiredProducts: products
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        minimumConfidence: confidence,
        maxTicketImages: 3,
      } as BrandCampaign);
    }

    setNotice(
      `Campaña guardada con ${locations.length} ${
        locations.length === 1 ? "ubicación" : "ubicaciones"
      }.`
    );
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
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label>
            Patrocinador / marca
            <input
              value={sponsor}
              onChange={(event) => setSponsor(event.target.value)}
            />
          </label>

          <label className={styles.full}>
            Descripción
            <textarea
              value={description}
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
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as DynamicCampaignStatus)
              }
            >
              <option value="draft">Borrador</option>
              <option value="scheduled">Programada</option>
              <option value="active">Activa</option>
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

          {type === "map" && (
            <label>
              Cantidad de premios
              <input
                type="number"
                min="1"
                max="30"
                value={locations.length}
                onChange={(event) => setPrizeCount(Number(event.target.value))}
              />
            </label>
          )}

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
        <button className={styles.save} type="button" onClick={() => void save()}>
          <Save />
          Guardar campaña
        </button>

        {notice && <p className={styles.notice}>{notice}</p>}
      </section>
    </div>
  );
}
