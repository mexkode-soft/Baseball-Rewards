"use client";

import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Copy,
  Eye,
  Gift,
  Globe2,
  Info,
  MapPin,
  Megaphone,
  MoreHorizontal,
  Send,
  Search,
  Check,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./CanalDifusion.module.css";
import { readBroadcasts, sendBroadcast, type BroadcastRecord } from "@/lib/broadcasts";
import { supabase } from "@/lib/supabase";
import { getStateCode, MEXICO_STATES } from "@/lib/mexicoCatalog";

type AudienceType =
  | "all"
  | "level"
  | "location"
  | "random"
  | "custom"
  | "sponsors"
  | "specific";

type MessageType =
  | "promotion"
  | "notice"
  | "urgent"
  | "information";

const audienceOptions = [
  {
    id: "all" as const,
    title: "Todos",
    description:
      "Enviar a toda la comunidad.",
    icon: Users,
  },
  {
    id: "level" as const,
    title: "Por nivel",
    description:
      "Novato, All Star o Leyenda.",
    icon: Trophy,
  },
  {
    id: "location" as const,
    title: "Por ubicación",
    description:
      "Seleccionar estados o zonas.",
    icon: MapPin,
  },
  {
    id: "random" as const,
    title: "Aleatorio",
    description:
      "Elegir usuarios al azar.",
    icon: Sparkles,
  },
  {
    id: "sponsors" as const,
    title: "Patrocinadores",
    description: "Enviar a todos los usuarios sponsor.",
    icon: Gift,
  },
  {
    id: "specific" as const,
    title: "Usuarios específicos",
    description: "Seleccionar hasta 10 personas.",
    icon: Target,
  },
  {
    id: "custom" as const,
    title: "Personalizado",
    description:
      "Combinar varios filtros.",
    icon: Target,
  },
];

const messageTypes = [
  {
    id: "promotion" as const,
    label: "Promoción",
    icon: Gift,
  },
  {
    id: "notice" as const,
    label: "Aviso",
    icon: Megaphone,
  },
  {
    id: "urgent" as const,
    label: "Urgente",
    icon: AlertTriangle,
  },
  {
    id: "information" as const,
    label: "Información",
    icon: Info,
  },
];

function obtenerClaveFechaLocal(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Page() {
  const [
    audienceType,
    setAudienceType,
  ] = useState<AudienceType>(
    "all"
  );

  const [
    messageType,
    setMessageType,
  ] = useState<MessageType>(
    "promotion"
  );

  const [
    title,
    setTitle,
  ] = useState(
    ""
  );

  const [
    message,
    setMessage,
  ] = useState(
    ""
  );

  const [
    priority,
    setPriority,
  ] = useState("normal");

  const [
    level,
    setLevel,
  ] = useState("All Star");

  const [
    state,
    setState,
  ] = useState("Veracruz de Ignacio de la Llave");

  const [municipality, setMunicipality] = useState("");
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(false);
  const [municipalitiesError, setMunicipalitiesError] = useState("");

  const [
    randomAmount,
    setRandomAmount,
  ] = useState("250");

  const [directory, setDirectory] = useState<Array<{id:string;email:string;full_name:string|null;role:string}>>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const [historyItems, setHistoryItems] = useState<BroadcastRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [isSending, setIsSending] = useState(false);
  const obtenerFechaLocal = () => {
    const ahora = new Date();
    const desfase = ahora.getTimezoneOffset() * 60_000;
    return new Date(ahora.getTime() - desfase).toISOString().slice(0, 10);
  };

  const [vigencia, setVigencia] = useState(obtenerFechaLocal);
  const [historyDate, setHistoryDate] = useState(obtenerFechaLocal);

  useEffect(() => {
    void readBroadcasts().then(setHistoryItems).catch(() => setHistoryItems([]));
    void supabase.from("profiles").select("id,email,full_name,role").in("role", ["usuario","sponsor"]).order("full_name").then(({data}) => setDirectory((data ?? []) as Array<{id:string;email:string;full_name:string|null;role:string}>));
  }, []);

  useEffect(() => {
    const stateCode = getStateCode(state);

    if (!stateCode) {
      setMunicipalities([]);
      setMunicipality("");
      setMunicipalitiesError("");
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function loadMunicipalities() {
      setMunicipalitiesLoading(true);
      setMunicipalitiesError("");

      try {
        const response = await fetch(`/api/geo/municipalities?state=${stateCode}`, {
          signal: controller.signal,
        });
        const payload = await response.json() as { municipalities?: string[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "No fue posible cargar los municipios.");
        if (!active) return;

        const options = payload.municipalities ?? [];
        setMunicipalities(options);
        setMunicipality((current) => current && options.includes(current) ? current : "");
      } catch (error) {
        if (controller.signal.aborted || !active) return;
        setMunicipalities([]);
        setMunicipalitiesError(error instanceof Error ? error.message : "No fue posible cargar los municipios.");
      } finally {
        if (active) setMunicipalitiesLoading(false);
      }
    }

    void loadMunicipalities();
    return () => { active = false; controller.abort(); };
  }, [state]);

  async function prepareSend() {
    if (isSending) return;
    if (!title.trim() || !message.trim()) { setNotice("Escribe el título y el mensaje."); return; }
    if (audienceType === "specific" && selectedUserIds.length === 0) { setNotice("Selecciona al menos un usuario."); return; }
    setIsSending(true);
    setNotice("Procesando y evitando envíos duplicados...");
    try {
      const idempotencyKey = crypto.randomUUID();
      const result = await sendBroadcast({
        title: title.trim(), body: message.trim(), messageType, priority, audienceType,
        level, state, municipality, randomAmount: Number(randomAmount) || 1, userIds: selectedUserIds,
        actionUrl: audienceType === "sponsors" ? "/patrocinador" : "/usuario",
        idempotencyKey,
      });
      setNotice(result.pushMessage ?? `Notificación enviada a ${result.recipients} ${result.recipients === 1 ? "usuario" : "usuarios"}.`);
      setTitle("");
      setMessage("");
      setSelectedUserIds([]);
      setAudienceType("all");
      setMessageType("promotion");
      setPriority("normal");
      setVigencia(obtenerFechaLocal());
      setHistoryItems(await readBroadcasts());
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo enviar el comunicado."); } finally { setIsSending(false); }
  }

  const selectedType =
    useMemo(
      () =>
        messageTypes.find(
          (item) =>
            item.id ===
            messageType
        ) ??
        messageTypes[0],
      [messageType]
    );

  const PreviewIcon =
    selectedType.icon;

  return (
    <>
      <div
        className={
          styles.pageHeader
        }
      >
        <div>
          <span>
            Home Run Rewards
          </span>

          <h1>
            Canal de difusión
          </h1>

          <p>
            Diseña promociones,
            avisos y comunicados
            segmentados para la
            bandeja de notificaciones
            de los usuarios.
          </p>
        </div>

        <div
          className={
            styles.headerStats
          }
        >
          <Bell />

          <div>
            <strong>
              {historyItems.length}
            </strong>

            <span>
              comunicaciones
              recientes
            </span>
          </div>
        </div>
      </div>

      <div
        className={
          styles.workspace
        }
      >
        <main
          className={
            styles.mainColumn
          }
        >
          <section
            className={
              styles.panel
            }
          >
            <div
              className={
                styles.sectionHeading
              }
            >
              <div>
                <span>
                  Paso 1
                </span>

                <h2>
                  Crear comunicado
                </h2>

                <p>
                  Captura la
                  información que verá
                  el usuario.
                </p>
              </div>

              <div
                className={
                  styles.draftBadge
                }
              >
                Borrador
              </div>
            </div>

            <div
              className={
                styles.typeSelector
              }
            >
              {messageTypes.map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        messageType ===
                        item.id
                          ? styles.typeButtonActive
                          : styles.typeButton
                      }
                      onClick={() =>
                        setMessageType(
                          item.id
                        )
                      }
                    >
                      <Icon />

                      <span>
                        {item.label}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            <div
              className={
                styles.formGrid
              }
            >
              <label
                className={
                  styles.fullField
                }
              >
                <span>
                  Título
                </span>

                <input
                  type="text"
                  value={title}
                  onChange={(
                    event
                  ) =>
                    setTitle(
                      event.target
                        .value
                    )
                  }
                  placeholder="Ej. Promoción exclusiva por tiempo limitado"
                />
              </label>

              <label
                className={
                  styles.fullField
                }
              >
                <span>
                  Mensaje
                </span>

                <textarea
                  value={message}
                  onChange={(
                    event
                  ) =>
                    setMessage(
                      event.target
                        .value
                    )
                  }
                  placeholder="Ej. Disfruta una recompensa especial disponible por tiempo limitado."
                  rows={5}
                />

                <small>
                  {message.length}/280
                  caracteres
                </small>
              </label>

              <label>
                <span>
                  Prioridad
                </span>

                <select
                  value={priority}
                  onChange={(
                    event
                  ) =>
                    setPriority(
                      event.target
                        .value
                    )
                  }
                >
                  <option
                    value="normal"
                  >
                    Normal
                  </option>

                  <option
                    value="important"
                  >
                    Importante
                  </option>

                  <option
                    value="urgent"
                  >
                    Urgente
                  </option>
                </select>
              </label>

              <label>
                <span>
                  Vigencia
                </span>

                <input
                  type="date"
                  value={vigencia}
                  min={obtenerFechaLocal()}
                  onChange={(evento) => setVigencia(evento.target.value)}
                />
              </label>
            </div>
          </section>

          <section
            className={
              styles.panel
            }
          >
            <div
              className={
                styles.sectionHeading
              }
            >
              <div>
                <span>
                  Paso 2
                </span>

                <h2>
                  Seleccionar audiencia
                </h2>

                <p>
                  Define quiénes
                  recibirán la
                  comunicación.
                </p>
              </div>
            </div>

            <div
              className={
                styles.audienceGrid
              }
            >
              {audienceOptions.map(
                (option) => {
                  const Icon =
                    option.icon;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={
                        audienceType ===
                        option.id
                          ? styles.audienceCardActive
                          : styles.audienceCard
                      }
                      onClick={() =>
                        setAudienceType(
                          option.id
                        )
                      }
                    >
                      <div
                        className={
                          styles.audienceIcon
                        }
                      >
                        <Icon />
                      </div>

                      <div>
                        <strong>
                          {
                            option.title
                          }
                        </strong>

                        <span>
                          {
                            option.description
                          }
                        </span>
                      </div>

                      <ChevronRight />
                    </button>
                  );
                }
              )}
            </div>

            <div
              className={
                styles.audienceConfiguration
              }
            >
              {audienceType ===
                "all" && (
                <div
                  className={
                    styles.selectionSummary
                  }
                >
                  <Globe2 />

                  <div>
                    <strong>
                      Toda la comunidad
                    </strong>

                    <span>
                      El mensaje se
                      enviará a todos
                      los usuarios
                      activos.
                    </span>
                  </div>
                </div>
              )}

              {audienceType ===
                "level" && (
                <label>
                  <span>
                    Nivel
                  </span>

                  <select
                    value={level}
                    onChange={(
                      event
                    ) =>
                      setLevel(
                        event.target
                          .value
                      )
                    }
                  >
                    <option>
                      Novato
                    </option>

                    <option>
                      All Star
                    </option>

                    <option>
                      Leyenda
                    </option>
                  </select>
                </label>
              )}

              {audienceType === "location" && (
                <div className={styles.customFilters}>
                  <label>
                    <span>Estado</span>
                    <select
                      value={state}
                      onChange={(event) => {
                        setState(event.target.value);
                        setMunicipality("");
                      }}
                    >
                      <option value="">Selecciona un estado</option>
                      {MEXICO_STATES.map((stateOption) => (
                        <option key={stateOption.code} value={stateOption.name}>
                          {stateOption.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Municipio <small>(opcional)</small></span>
                    <select
                      value={municipality}
                      onChange={(event) => setMunicipality(event.target.value)}
                      disabled={!state || municipalitiesLoading}
                    >
                      <option value="">
                        {!state
                          ? "Primero selecciona un estado"
                          : municipalitiesLoading
                            ? "Cargando municipios..."
                            : "Todo el estado"}
                      </option>
                      {municipalities.map((municipalityOption) => (
                        <option key={municipalityOption} value={municipalityOption}>
                          {municipalityOption}
                        </option>
                      ))}
                    </select>
                    {municipalitiesError ? <small>{municipalitiesError}</small> : null}
                  </label>
                </div>
              )}

              {audienceType === "specific" && (
                <div className={`${styles.fullField} ${styles.recipientSelector}`}>
                  <div className={styles.recipientHeader}>
                    <div>
                      <strong>Destinatarios</strong>
                      <small>Selecciona hasta 10 personas.</small>
                    </div>
                    <span className={styles.recipientCounter}>{selectedUserIds.length}/10</span>
                  </div>

                  <label className={styles.recipientSearch}>
                    <Search aria-hidden="true" />
                    <input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Buscar por nombre o correo"
                    />
                  </label>

                  <div className={styles.recipientList}>
                    {directory
                      .filter((user) => `${user.full_name ?? ""} ${user.email}`.toLowerCase().includes(userSearch.toLowerCase()))
                      .map((user) => {
                        const checked = selectedUserIds.includes(user.id);
                        const initials = (user.full_name || user.email || "U")
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part.charAt(0).toUpperCase())
                          .join("");

                        return (
                          <button
                            type="button"
                            key={user.id}
                            className={`${styles.recipientOption} ${checked ? styles.recipientSelected : ""}`}
                            disabled={!checked && selectedUserIds.length >= 10}
                            onClick={() =>
                              setSelectedUserIds((current) =>
                                checked
                                  ? current.filter((id) => id !== user.id)
                                  : [...current, user.id].slice(0, 10)
                              )
                            }
                          >
                            <span className={styles.recipientAvatar}>{initials}</span>
                            <span className={styles.recipientIdentity}>
                              <strong>{user.full_name || "Usuario"}</strong>
                              <small>{user.email}</small>
                            </span>
                            <span className={styles.recipientRole}>{user.role}</span>
                            <span className={styles.recipientCheck} aria-hidden="true">
                              {checked ? <Check size={17} /> : null}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {audienceType ===
                "random" && (
                <label>
                  <span>
                    Cantidad de usuarios
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={
                      randomAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setRandomAmount(
                        event.target
                          .value
                      )
                    }
                  />
                </label>
              )}

              {audienceType === "custom" && (
                <div className={styles.customFilters}>
                  <label>
                    <span>Nivel</span>
                    <select value={level} onChange={(event) => setLevel(event.target.value)}>
                      <option>Novato</option>
                      <option>All Star</option>
                      <option>Leyenda</option>
                    </select>
                  </label>

                  <label>
                    <span>Estado</span>
                    <select
                      value={state}
                      onChange={(event) => {
                        setState(event.target.value);
                        setMunicipality("");
                      }}
                    >
                      <option value="">Selecciona un estado</option>
                      {MEXICO_STATES.map((stateOption) => (
                        <option key={stateOption.code} value={stateOption.name}>
                          {stateOption.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Municipio <small>(opcional)</small></span>
                    <select
                      value={municipality}
                      onChange={(event) => setMunicipality(event.target.value)}
                      disabled={!state || municipalitiesLoading}
                    >
                      <option value="">
                        {!state
                          ? "Primero selecciona un estado"
                          : municipalitiesLoading
                            ? "Cargando municipios..."
                            : "Todo el estado"}
                      </option>
                      {municipalities.map((municipalityOption) => (
                        <option key={municipalityOption} value={municipalityOption}>
                          {municipalityOption}
                        </option>
                      ))}
                    </select>
                    {municipalitiesError ? <small>{municipalitiesError}</small> : null}
                  </label>
                </div>
              )}
            </div>
          </section>

          <section
            className={
              styles.panel
            }
          >
            <div
              className={
                styles.sectionHeading
              }
            >
              <div>
                <span>
                  Paso 3
                </span>

                <h2>
                  Programación
                </h2>

                <p>
                  Define cuándo debe
                  publicarse el
                  mensaje.
                </p>
              </div>
            </div>

            <div
              className={
                styles.scheduleOptions
              }
            >
              <button
                type="button"
                className={
                  styles.scheduleOptionActive
                }
              >
                <Send />

                <div>
                  <strong>
                    Enviar ahora
                  </strong>

                  <span>
                    Publicación
                    inmediata
                  </span>
                </div>
              </button>

              <button
                type="button"
                className={
                  styles.scheduleOption
                }
              >
                <CalendarClock />

                <div>
                  <strong>
                    Programar
                  </strong>

                  <span>
                    Elegir fecha y hora
                  </span>
                </div>
              </button>
            </div>

            <div
              className={
                styles.footerActions
              }
            >
              <button
                type="button"
                className={
                  styles.secondaryButton
                }
              >
                Guardar borrador
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => { void prepareSend(); }}
                disabled={isSending}
                aria-busy={isSending}
              >
                <Send />

                {isSending ? "Enviando..." : "Enviar anuncio"}
              </button>
            </div>
            {notice && <p className={`${styles.noticeMessage} ${notice.startsWith("Notificación enviada") ? styles.noticeSuccess : notice.startsWith("Procesando") ? styles.noticeInfo : styles.noticeError}`}>{notice}</p>}
          </section>
        </main>

        <aside
          className={
            styles.previewColumn
          }
        >
          <section
            className={
              styles.previewPanel
            }
          >
            <div
              className={
                styles.previewHeader
              }
            >
              <div>
                <span>
                  Previsualización
                </span>

                <h2>
                  Bandeja del usuario
                </h2>
              </div>

              <Eye />
            </div>

            <div
              className={
                styles.phoneMockup
              }
            >
              <div
                className={
                  styles.phoneTop
                }
              >
                <span>
                  9:41
                </span>

                <Bell />
              </div>

              <div
                className={
                  styles.notificationCard
                }
              >
                <div
                  className={
                    styles.notificationIcon
                  }
                >
                  <PreviewIcon />
                </div>

                <div
                  className={
                    styles.notificationContent
                  }
                >
                  <div
                    className={
                      styles.notificationMeta
                    }
                  >
                    <span>
                      Home Run Rewards
                    </span>

                    <small>
                      Ahora
                    </small>
                  </div>

                  <strong>
                    {title ||
                      "Título del comunicado"}
                  </strong>

                  <p>
                    {message ||
                      "Aquí aparecerá el contenido del mensaje."}
                  </p>

                  <div
                    className={
                      styles.notificationFooter
                    }
                  >
                    <span>
                      {priority ===
                      "urgent"
                        ? "Urgente"
                        : priority ===
                            "important"
                          ? "Importante"
                          : selectedType.label}
                    </span>

                    <button
                      type="button"
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
              </div>

              <div
                className={
                  styles.phoneEmpty
                }
              >
                <Bell />

                <span>
                  Tus demás
                  notificaciones
                  aparecerán aquí
                </span>
              </div>
            </div>

            <div
              className={
                styles.audiencePreview
              }
            >
              <Target />

              <div>
                <span>
                  Audiencia elegida
                </span>

                <strong>
                  {audienceType ===
                    "all" &&
                    "Toda la comunidad"}

                  {audienceType ===
                    "level" &&
                    `Nivel ${level}`}

                  {audienceType ===
                    "location" &&
                    `Usuarios de ${state}`}

                  {audienceType ===
                    "random" &&
                    `${randomAmount || "0"} usuarios aleatorios`}

                  {audienceType ===
                    "custom" &&
                    "All Star de Veracruz"}
                </strong>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section
        className={
          styles.historyPanel
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              Historial
            </span>

            <h2>
              Comunicaciones recientes
            </h2>

            <p>Por defecto se muestra el día actual. Cambia la fecha para consultar días anteriores.</p>
            <label className={styles.historyFilter}>Fecha del historial<input type="date" value={historyDate} onChange={(evento)=>setHistoryDate(evento.target.value)} /></label>
          </div>
        </div>

        <div
          className={
            styles.historyList
          }
        >
          {historyItems.filter((item) => obtenerClaveFechaLocal(item.date) === historyDate).map(
            (item) => (
              <article
                key={item.id}
                className={
                  styles.historyItem
                }
              >
                <div
                  className={
                    styles.historyIcon
                  }
                >
                  {item.status ===
                  "sent" ? (
                    <CheckCircle2 />
                  ) : item.status ===
                    "scheduled" ? (
                    <CalendarClock />
                  ) : (
                    <Megaphone />
                  )}
                </div>

                <div
                  className={
                    styles.historyMain
                  }
                >
                  <strong>
                    {item.title}
                  </strong>

                  <span>
                    {item.audience}
                  </span>
                </div>

                <div
                  className={
                    styles.historyData
                  }
                >
                  <span>
                    Tipo
                  </span>

                  <strong>
                    {item.type}
                  </strong>
                </div>

                <div
                  className={
                    styles.historyData
                  }
                >
                  <span>
                    Destinatarios
                  </span>

                  <strong>
                    {
                      item.recipients
                    }
                  </strong>
                </div>

                <div
                  className={
                    styles.historyData
                  }
                >
                  <span>
                    Fecha
                  </span>

                  <strong>
                    {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.date))}
                  </strong>
                </div>

                <div
                  className={
                    styles.statusColumn
                  }
                >
                  <span
                    className={
                      item.status ===
                      "Enviado"
                        ? styles.statusSent
                        : item.status ===
                            "Programado"
                          ? styles.statusScheduled
                          : styles.statusDraft
                    }
                  >
                    {item.status === "sent" ? "Enviado" : item.status === "scheduled" ? "Programado" : "Borrador"}
                  </span>
                </div>

                <div
                  className={
                    styles.historyActions
                  }
                >
                  <button
                    type="button"
                    title="Duplicar"
                    aria-label="Duplicar comunicación"
                  >
                    <Copy />
                  </button>

                  <button
                    type="button"
                    title="Más opciones"
                    aria-label="Más opciones"
                  >
                    <MoreHorizontal />
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      </section>
    </>
  );
}
