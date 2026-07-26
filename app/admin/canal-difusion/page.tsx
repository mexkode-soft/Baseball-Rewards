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
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import styles from "./CanalDifusion.module.css";

type AudienceType =
  | "all"
  | "level"
  | "location"
  | "random"
  | "custom";

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

const historyItems = [
  {
    title:
      "Partido cancelado en Veracruz",
    audience:
      "Usuarios de Veracruz",
    type: "Urgente",
    date: "Hoy, 8:30 a. m.",
    recipients: "1,284",
    status: "Enviado",
  },
  {
    title:
      "Recompensa exclusiva All Star",
    audience:
      "Nivel All Star",
    type: "Promoción",
    date: "25 jul, 6:00 p. m.",
    recipients: "846",
    status: "Programado",
  },
  {
    title:
      "Nuevos retos disponibles",
    audience:
      "Toda la comunidad",
    type: "Información",
    date: "24 jul, 11:15 a. m.",
    recipients: "5,930",
    status: "Enviado",
  },
  {
    title:
      "Beneficio sorpresa",
    audience:
      "250 usuarios aleatorios",
    type: "Promoción",
    date: "23 jul, 4:40 p. m.",
    recipients: "250",
    status: "Borrador",
  },
];

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
    "Promoción exclusiva"
  );

  const [
    message,
    setMessage,
  ] = useState(
    "Disfruta una recompensa especial disponible por tiempo limitado."
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
  ] = useState("Veracruz");

  const [
    randomAmount,
    setRandomAmount,
  ] = useState("250");

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
              4
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
                  placeholder="Ej. Partido cancelado"
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
                  placeholder="Escribe el contenido del comunicado"
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
                  defaultValue="2026-07-31"
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

              {audienceType ===
                "location" && (
                <label>
                  <span>
                    Estado
                  </span>

                  <select
                    value={state}
                    onChange={(
                      event
                    ) =>
                      setState(
                        event.target
                          .value
                      )
                    }
                  >
                    <option>
                      Veracruz
                    </option>

                    <option>
                      Sinaloa
                    </option>

                    <option>
                      Sonora
                    </option>

                    <option>
                      Jalisco
                    </option>
                  </select>
                </label>
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

              {audienceType ===
                "custom" && (
                <div
                  className={
                    styles.customFilters
                  }
                >
                  <label>
                    <span>
                      Nivel
                    </span>

                    <select>
                      <option>
                        All Star
                      </option>

                      <option>
                        Novato
                      </option>

                      <option>
                        Leyenda
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>
                      Estado
                    </span>

                    <select>
                      <option>
                        Veracruz
                      </option>

                      <option>
                        Sinaloa
                      </option>

                      <option>
                        Sonora
                      </option>
                    </select>
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
                className={
                  styles.primaryButton
                }
              >
                <Send />

                Preparar envío
              </button>
            </div>
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

            <p>
              Vista de ejemplo de los
              mensajes enviados,
              programados y guardados.
            </p>
          </div>
        </div>

        <div
          className={
            styles.historyList
          }
        >
          {historyItems.map(
            (item) => (
              <article
                key={item.title}
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
                  "Enviado" ? (
                    <CheckCircle2 />
                  ) : item.status ===
                    "Programado" ? (
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
                    {item.date}
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
                    {item.status}
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
