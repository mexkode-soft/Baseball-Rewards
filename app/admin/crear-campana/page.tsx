"use client";

import {
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Copy,
  Gift,
  ImagePlus,
  MapPin,
  PauseCircle,
  Pencil,
  QrCode,
  Save,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import styles from "./CrearCampana.module.css";

type CampaignType =
  | "qr"
  | "brand"
  | "map";

const campaignTypes = [
  {
    id: "qr" as const,
    title: "Búsqueda QR",
    subtitle:
      "Códigos escondidos dentro del estadio.",
    description:
      "Configura códigos ganadores y códigos sin premio.",
    icon: QrCode,
  },
  {
    id: "brand" as const,
    title: "Visita a marca",
    subtitle:
      "Validación por QR y ubicación.",
    description:
      "Premia visitas dentro del radio permitido.",
    icon: Store,
  },
  {
    id: "map" as const,
    title: "Recompensa en mapa",
    subtitle:
      "Premios colocados en ubicaciones.",
    description:
      "Publica recompensas visibles en Cazar recompensas.",
    icon: MapPin,
  },
];

const campaignExamples = [
  {
    name:
      "Tesoro del estadio",
    type: "Búsqueda QR",
    status: "Activa",
    date:
      "26 jul - 02 ago",
    reward:
      "2 premios",
    icon: QrCode,
    tone: "qr",
  },
  {
    name:
      "Visita Café Home Run",
    type: "Visita a marca",
    status: "Programada",
    date:
      "01 ago - 15 ago",
    reward:
      "150 puntos",
    icon: Store,
    tone: "brand",
  },
  {
    name:
      "Pelota dorada",
    type:
      "Recompensa en mapa",
    status: "Borrador",
    date:
      "Sin publicar",
    reward:
      "3 ubicaciones",
    icon: MapPin,
    tone: "map",
  },
];

export default function Page() {
  const [
    campaignType,
    setCampaignType,
  ] =
    useState<CampaignType>(
      "qr"
    );

  const [
    campaignName,
    setCampaignName,
  ] = useState(
    "Tesoro del estadio"
  );

  const [
    sponsor,
    setSponsor,
  ] = useState(
    "Home Run Rewards"
  );

  const [
    description,
    setDescription,
  ] = useState(
    "Encuentra los códigos QR escondidos dentro del estadio y descubre si ganaste."
  );

  const selectedType =
    useMemo(
      () =>
        campaignTypes.find(
          (item) =>
            item.id ===
            campaignType
        ) ??
        campaignTypes[0],
      [campaignType]
    );

  const SelectedIcon =
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
            Administración
          </span>

          <h1>
            Crear campaña
          </h1>

          <p>
            Configura experiencias,
            recompensas y ubicaciones
            que aparecerán en Cazar
            recompensas.
          </p>
        </div>

        <div
          className={
            styles.headerSummary
          }
        >
          <Trophy />

          <div>
            <strong>
              3
            </strong>

            <span>
              modalidades
              disponibles
            </span>
          </div>
        </div>
      </div>

      <section
        className={
          styles.typeSection
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
              Selecciona la modalidad
            </h2>

            <p>
              Cada tipo de campaña
              tiene una configuración
              diferente.
            </p>
          </div>
        </div>

        <div
          className={
            styles.typeGrid
          }
        >
          {campaignTypes.map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={
                    campaignType ===
                    item.id
                      ? `${styles.typeCard} ${styles[`typeCardActive_${item.id}`]}`
                      : styles.typeCard
                  }
                  onClick={() =>
                    setCampaignType(
                      item.id
                    )
                  }
                >
                  <div
                    className={
                      `${styles.typeIcon} ${styles[`typeIcon_${item.id}`]}`
                    }
                  >
                    <Icon />
                  </div>

                  <div
                    className={
                      styles.typeContent
                    }
                  >
                    <strong>
                      {item.title}
                    </strong>

                    <span>
                      {
                        item.subtitle
                      }
                    </span>

                    <p>
                      {
                        item.description
                      }
                    </p>
                  </div>

                  <ChevronRight />
                </button>
              );
            }
          )}
        </div>
      </section>

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
                  Paso 2
                </span>

                <h2>
                  Información general
                </h2>

                <p>
                  Datos visibles para
                  el usuario.
                </p>
              </div>

              <div
                className={
                  `${styles.modeBadge} ${styles[`modeBadge_${campaignType}`]}`
                }
              >
                <SelectedIcon />

                {
                  selectedType.title
                }
              </div>
            </div>

            <div
              className={
                styles.formGrid
              }
            >
              <label>
                <span>
                  Nombre de la campaña
                </span>

                <input
                  type="text"
                  value={
                    campaignName
                  }
                  onChange={(
                    event
                  ) =>
                    setCampaignName(
                      event.target
                        .value
                    )
                  }
                  placeholder="Nombre de la campaña"
                />
              </label>

              <label>
                <span>
                  Patrocinador
                </span>

                <input
                  type="text"
                  value={sponsor}
                  onChange={(
                    event
                  ) =>
                    setSponsor(
                      event.target
                        .value
                    )
                  }
                  placeholder="Marca patrocinadora"
                />
              </label>

              <label>
                <span>
                  Fecha de inicio
                </span>

                <input
                  type="date"
                  defaultValue="2026-07-26"
                />
              </label>

              <label>
                <span>
                  Fecha de cierre
                </span>

                <input
                  type="date"
                  defaultValue="2026-08-02"
                />
              </label>

              <label
                className={
                  styles.fullField
                }
              >
                <span>
                  Descripción
                </span>

                <textarea
                  value={
                    description
                  }
                  onChange={(
                    event
                  ) =>
                    setDescription(
                      event.target
                        .value
                    )
                  }
                  placeholder="Objetivo y mecánica"
                  rows={4}
                />
              </label>

              <label
                className={
                  styles.uploadField
                }
              >
                <ImagePlus />

                <div>
                  <strong>
                    Imagen de portada
                  </strong>

                  <span>
                    PNG, JPG o WEBP
                  </span>
                </div>

                <input
                  type="file"
                  accept="image/*"
                />
              </label>
            </div>
          </section>

          <section
            className={
              `${styles.panel} ${styles[`configurationPanel_${campaignType}`]}`
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
                  Configuración de la dinámica
                </h2>

                <p>
                  Ajusta los datos
                  propios de esta
                  modalidad.
                </p>
              </div>
            </div>

            {campaignType ===
              "qr" && (
              <div
                className={
                  styles.formGrid
                }
              >
                <label>
                  <span>
                    Total de códigos QR
                  </span>

                  <input
                    type="number"
                    min="1"
                    defaultValue="16"
                  />
                </label>

                <label>
                  <span>
                    Códigos ganadores
                  </span>

                  <input
                    type="number"
                    min="1"
                    defaultValue="2"
                  />
                </label>

                <label>
                  <span>
                    Códigos sin premio
                  </span>

                  <input
                    type="number"
                    min="0"
                    defaultValue="14"
                  />
                </label>

                <label>
                  <span>
                    Intentos por usuario
                  </span>

                  <input
                    type="number"
                    min="1"
                    defaultValue="1"
                  />
                </label>

                <label>
                  <span>
                    Premio
                  </span>

                  <input
                    type="text"
                    defaultValue="Premio sorpresa"
                  />
                </label>

                <label>
                  <span>
                    Puntos adicionales
                  </span>

                  <input
                    type="number"
                    min="0"
                    defaultValue="100"
                  />
                </label>

                <div
                  className={
                    styles.qrSummary
                  }
                >
                  <ScanLine />

                  <div>
                    <strong>
                      Distribución prevista
                    </strong>

                    <span>
                      16 códigos únicos,
                      2 ganadores y 14
                      sin premio.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {campaignType ===
              "brand" && (
              <div
                className={
                  styles.formGrid
                }
              >
                <label>
                  <span>
                    Marca o sucursal
                  </span>

                  <input
                    type="text"
                    defaultValue="Café Home Run"
                  />
                </label>

                <label>
                  <span>
                    Dirección
                  </span>

                  <input
                    type="text"
                    defaultValue="Av. Principal 120"
                  />
                </label>

                <label>
                  <span>
                    Latitud
                  </span>

                  <input
                    type="number"
                    step="any"
                    defaultValue="19.1738"
                  />
                </label>

                <label>
                  <span>
                    Longitud
                  </span>

                  <input
                    type="number"
                    step="any"
                    defaultValue="-96.1342"
                  />
                </label>

                <label>
                  <span>
                    Radio permitido
                  </span>

                  <div
                    className={
                      styles.inputSuffix
                    }
                  >
                    <input
                      type="number"
                      min="1"
                      defaultValue="100"
                    />

                    <span>
                      metros
                    </span>
                  </div>
                </label>

                <label>
                  <span>
                    Recompensa
                  </span>

                  <input
                    type="text"
                    defaultValue="150 puntos"
                  />
                </label>

                <div
                  className={
                    styles.brandSummary
                  }
                >
                  <ShieldCheck />

                  <div>
                    <strong>
                      Validación doble
                    </strong>

                    <span>
                      El usuario deberá
                      escanear el QR y
                      estar dentro del
                      radio permitido.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {campaignType ===
              "map" && (
              <>
                <div
                  className={
                    styles.formGrid
                  }
                >
                  <label>
                    <span>
                      Nombre del premio
                    </span>

                    <input
                      type="text"
                      defaultValue="Pelota dorada"
                    />
                  </label>

                  <label>
                    <span>
                      Cantidad disponible
                    </span>

                    <input
                      type="number"
                      min="1"
                      defaultValue="3"
                    />
                  </label>

                  <label>
                    <span>
                      Puntos
                    </span>

                    <input
                      type="number"
                      min="0"
                      defaultValue="100"
                    />
                  </label>

                  <label>
                    <span>
                      Radio para reclamar
                    </span>

                    <div
                      className={
                        styles.inputSuffix
                      }
                    >
                      <input
                        type="number"
                        min="1"
                        defaultValue="35"
                      />

                      <span>
                        metros
                      </span>
                    </div>
                  </label>
                </div>

                <div
                  className={
                    styles.locationsHeader
                  }
                >
                  <div>
                    <strong>
                      Ubicaciones del premio
                    </strong>

                    <span>
                      Puedes colocar el
                      mismo premio en
                      varias zonas.
                    </span>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.addLocationButton
                    }
                  >
                    <MapPin />

                    Agregar ubicación
                  </button>
                </div>

                <div
                  className={
                    styles.locationList
                  }
                >
                  {[
                    "Entrada norte del estadio",
                    "Zona de alimentos",
                    "Estacionamiento principal",
                  ].map(
                    (
                      location,
                      index
                    ) => (
                      <article
                        key={
                          location
                        }
                        className={
                          styles.locationCard
                        }
                      >
                        <div
                          className={
                            styles.locationNumber
                          }
                        >
                          {index + 1}
                        </div>

                        <MapPin />

                        <div>
                          <strong>
                            {location}
                          </strong>

                          <span>
                            Radio activo:
                            35 metros
                          </span>
                        </div>

                        <button
                          type="button"
                        >
                          <Pencil />
                        </button>
                      </article>
                    )
                  )}
                </div>
              </>
            )}
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
                  Paso 4
                </span>

                <h2>
                  Recompensa y participación
                </h2>

                <p>
                  Define límites y
                  comportamiento general.
                </p>
              </div>
            </div>

            <div
              className={
                styles.formGrid
              }
            >
              <label>
                <span>
                  Participaciones por usuario
                </span>

                <input
                  type="number"
                  min="1"
                  defaultValue="1"
                />
              </label>

              <label>
                <span>
                  Estado inicial
                </span>

                <select
                  defaultValue="draft"
                >
                  <option
                    value="draft"
                  >
                    Borrador
                  </option>

                  <option
                    value="scheduled"
                  >
                    Programada
                  </option>

                  <option
                    value="active"
                  >
                    Activa
                  </option>
                </select>
              </label>

              <label>
                <span>
                  Visibilidad
                </span>

                <select
                  defaultValue="public"
                >
                  <option
                    value="public"
                  >
                    Visible para todos
                  </option>

                  <option
                    value="level"
                  >
                    Por nivel
                  </option>

                  <option
                    value="state"
                  >
                    Por estado
                  </option>
                </select>
              </label>

              <label>
                <span>
                  Puntos por completar
                </span>

                <input
                  type="number"
                  min="0"
                  defaultValue="100"
                />
              </label>
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
                <Save />

                Guardar campaña
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
              `${styles.previewPanel} ${styles[`previewPanel_${campaignType}`]}`
            }
          >
            <div
              className={
                styles.previewTop
              }
            >
              <span>
                Vista previa
              </span>

              <CircleDot />
            </div>

            <div
              className={
                styles.previewImage
              }
            >
              <SelectedIcon />

              <div
                className={
                  styles.previewGlow
                }
              />
            </div>

            <div
              className={
                styles.previewContent
              }
            >
              <div
                className={
                  `${styles.previewType} ${styles[`previewType_${campaignType}`]}`
                }
              >
                {
                  selectedType.title
                }
              </div>

              <h2>
                {campaignName ||
                  "Nombre de la campaña"}
              </h2>

              <p>
                {description ||
                  "Descripción de la campaña"}
              </p>

              <div
                className={
                  styles.previewMeta
                }
              >
                <div>
                  <CalendarDays />

                  <span>
                    26 jul - 02 ago
                  </span>
                </div>

                <div>
                  <Users />

                  <span>
                    1 intento
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={
                  `${styles.previewButton} ${styles[`previewButton_${campaignType}`]}`
                }
              >
                <Target />

                Ver recompensa
              </button>
            </div>
          </section>

          <section
            className={
              styles.publishChecklist
            }
          >
            <h3>
              Antes de publicar
            </h3>

            {[
              "Información general",
              "Configuración de dinámica",
              "Recompensa definida",
              "Vigencia establecida",
            ].map(
              (item) => (
                <div
                  key={item}
                >
                  <CheckCircle2 />

                  <span>
                    {item}
                  </span>
                </div>
              )
            )}
          </section>
        </aside>
      </div>

      <section
        className={
          styles.campaignListSection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              Gestión
            </span>

            <h2>
              Campañas creadas
            </h2>

            <p>
              Vista de ejemplo de las
              campañas configuradas.
            </p>
          </div>
        </div>

        <div
          className={
            styles.campaignList
          }
        >
          {campaignExamples.map(
            (campaign) => {
              const Icon =
                campaign.icon;

              return (
                <article
                  key={
                    campaign.name
                  }
                  className={
                    `${styles.campaignCard} ${styles[`campaignCard_${campaign.tone}`]}`
                  }
                >
                  <div
                    className={
                      `${styles.campaignIcon} ${styles[`campaignIcon_${campaign.tone}`]}`
                    }
                  >
                    <Icon />
                  </div>

                  <div
                    className={
                      styles.campaignMain
                    }
                  >
                    <strong>
                      {campaign.name}
                    </strong>

                    <span>
                      {campaign.type}
                    </span>
                  </div>

                  <div
                    className={
                      styles.campaignData
                    }
                  >
                    <small>
                      Vigencia
                    </small>

                    <strong>
                      {campaign.date}
                    </strong>
                  </div>

                  <div
                    className={
                      styles.campaignData
                    }
                  >
                    <small>
                      Recompensa
                    </small>

                    <strong>
                      {
                        campaign.reward
                      }
                    </strong>
                  </div>

                  <span
                    className={
                      campaign.status ===
                      "Activa"
                        ? styles.statusActive
                        : campaign.status ===
                            "Programada"
                          ? styles.statusScheduled
                          : styles.statusDraft
                    }
                  >
                    {campaign.status}
                  </span>

                  <div
                    className={
                      styles.cardActions
                    }
                  >
                    <button
                      type="button"
                      title="Editar"
                    >
                      <Pencil />
                    </button>

                    <button
                      type="button"
                      title="Duplicar"
                    >
                      <Copy />
                    </button>

                    <button
                      type="button"
                      title="Pausar"
                    >
                      <PauseCircle />
                    </button>

                    <button
                      type="button"
                      title="Eliminar"
                      className={
                        styles.deleteButton
                      }
                    >
                      <Trash2 />
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>
    </>
  );
}
