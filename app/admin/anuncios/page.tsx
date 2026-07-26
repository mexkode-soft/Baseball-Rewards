"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Gift,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Star,
  TicketPercent,
  Trash2,
  Trophy,
  X,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type Announcement,
  type AnnouncementIcon,
  DEFAULT_ANNOUNCEMENTS,
  readAnnouncements,
  saveAnnouncements,
} from "@/lib/announcements";

import styles from "./Anuncios.module.css";

const iconOptions: {
  value: AnnouncementIcon;
  label: string;
  icon: typeof Gift;
}[] = [
  {
    value: "ticket",
    label: "Promoción",
    icon: TicketPercent,
  },
  {
    value: "gift",
    label: "Regalo",
    icon: Gift,
  },
  {
    value: "trophy",
    label: "Ranking",
    icon: Trophy,
  },
  {
    value: "star",
    label: "Destacado",
    icon: Star,
  },
];

const iconMap = {
  ticket: TicketPercent,
  gift: Gift,
  trophy: Trophy,
  star: Star,
};

function createId() {
  if (
    typeof crypto !==
      "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `announcement-${Date.now()}`;
}

export default function Page() {
  const [
    announcements,
    setAnnouncements,
  ] = useState<Announcement[]>(
    DEFAULT_ANNOUNCEMENTS
  );

  const [
    text,
    setText,
  ] = useState("");

  const [
    icon,
    setIcon,
  ] =
    useState<AnnouncementIcon>(
      "ticket"
    );

  const [
    editingId,
    setEditingId,
  ] = useState<
    string | null
  >(null);

  const [
    message,
    setMessage,
  ] = useState("");

  useEffect(() => {
    setAnnouncements(
      readAnnouncements()
    );
  }, []);

  const activeAnnouncements =
    useMemo(
      () =>
        announcements.filter(
          (announcement) =>
            announcement.active
        ),
      [announcements]
    );

  function persist(
    nextAnnouncements:
      Announcement[]
  ) {
    setAnnouncements(
      nextAnnouncements
    );

    saveAnnouncements(
      nextAnnouncements
    );
  }

  function resetForm() {
    setText("");
    setIcon("ticket");
    setEditingId(null);
  }

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedText =
      text.trim();

    if (!trimmedText) {
      setMessage(
        "Escribe el texto del anuncio."
      );

      return;
    }

    if (editingId) {
      const nextAnnouncements =
        announcements.map(
          (announcement) =>
            announcement.id ===
            editingId
              ? {
                  ...announcement,
                  text: trimmedText,
                  icon,
                }
              : announcement
        );

      persist(
        nextAnnouncements
      );

      setMessage(
        "Anuncio actualizado."
      );
    } else {
      const newAnnouncement:
        Announcement = {
        id: createId(),
        text: trimmedText,
        icon,
        active: true,
        order:
          announcements.length +
          1,
      };

      persist([
        ...announcements,
        newAnnouncement,
      ]);

      setMessage(
        "Anuncio agregado."
      );
    }

    resetForm();
  }

  function editAnnouncement(
    announcement: Announcement
  ) {
    setEditingId(
      announcement.id
    );

    setText(
      announcement.text
    );

    setIcon(
      announcement.icon
    );

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function toggleAnnouncement(
    id: string
  ) {
    persist(
      announcements.map(
        (announcement) =>
          announcement.id === id
            ? {
                ...announcement,
                active:
                  !announcement.active,
              }
            : announcement
      )
    );
  }

  function deleteAnnouncement(
    id: string
  ) {
    const nextAnnouncements =
      announcements
        .filter(
          (announcement) =>
            announcement.id !== id
        )
        .map(
          (
            announcement,
            index
          ) => ({
            ...announcement,
            order: index + 1,
          })
        );

    persist(
      nextAnnouncements
    );

    if (
      editingId === id
    ) {
      resetForm();
    }
  }

  function moveAnnouncement(
    index: number,
    direction:
      | "up"
      | "down"
  ) {
    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        announcements.length
    ) {
      return;
    }

    const reordered = [
      ...announcements,
    ];

    [
      reordered[index],
      reordered[targetIndex],
    ] = [
      reordered[targetIndex],
      reordered[index],
    ];

    persist(
      reordered.map(
        (
          announcement,
          itemIndex
        ) => ({
          ...announcement,
          order:
            itemIndex + 1,
        })
      )
    );
  }

  function restoreDefaults() {
    persist(
      DEFAULT_ANNOUNCEMENTS
    );

    resetForm();

    setMessage(
      "Anuncios predeterminados restaurados."
    );
  }

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
            Anuncios
          </h1>

          <p>
            Administra el contenido
            que aparecerá en la cinta
            infinita de la página de
            inicio.
          </p>
        </div>

        <div
          className={
            styles.headerCounter
          }
        >
          <Megaphone />

          <strong>
            {
              activeAnnouncements.length
            }
          </strong>

          <span>
            activos
          </span>
        </div>
      </div>

      <section
        className={
          styles.editorSection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              Configuración
            </span>

            <h2>
              {editingId
                ? "Editar anuncio"
                : "Crear anuncio"}
            </h2>

            <p>
              Define el texto y el
              ícono que aparecerán en
              la cinta.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              className={
                styles.cancelButton
              }
              onClick={
                resetForm
              }
            >
              <X />

              Cancelar edición
            </button>
          )}
        </div>

        <form
          className={
            styles.form
          }
          onSubmit={
            handleSubmit
          }
        >
          <label
            className={
              styles.textField
            }
          >
            <span>
              Texto del anuncio
            </span>

            <input
              type="text"
              value={text}
              onChange={(
                event
              ) =>
                setText(
                  event.target
                    .value
                )
              }
              placeholder="Ej. Obtén premios sorpresa durante el partido"
              maxLength={90}
            />

            <small>
              {text.length}/90
              caracteres
            </small>
          </label>

          <div
            className={
              styles.iconField
            }
          >
            <span>
              Tipo de ícono
            </span>

            <div
              className={
                styles.iconOptions
              }
            >
              {iconOptions.map(
                (option) => {
                  const Icon =
                    option.icon;

                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      className={
                        icon ===
                        option.value
                          ? styles.iconOptionActive
                          : styles.iconOption
                      }
                      onClick={() =>
                        setIcon(
                          option.value
                        )
                      }
                    >
                      <Icon />

                      <span>
                        {
                          option.label
                        }
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <button
            type="submit"
            className={
              styles.saveButton
            }
          >
            {editingId ? (
              <Save />
            ) : (
              <Plus />
            )}

            {editingId
              ? "Guardar cambios"
              : "Agregar anuncio"}
          </button>
        </form>

        {message && (
          <p
            className={
              styles.statusMessage
            }
          >
            {message}
          </p>
        )}
      </section>

      <section
        className={
          styles.previewSection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              Previsualización
            </span>

            <h2>
              Vista de la cinta
            </h2>

            <p>
              Así se mostrará el
              contenido activo en el
              inicio.
            </p>
          </div>
        </div>

        <div
          className={
            styles.previewTicker
          }
        >
          {activeAnnouncements.length >
          0 ? (
            <div
              className={
                styles.previewTrack
              }
            >
              {activeAnnouncements.map(
                (
                  announcement
                ) => {
                  const Icon =
                    iconMap[
                      announcement
                        .icon
                    ];

                  return (
                    <div
                      key={
                        announcement.id
                      }
                      className={
                        styles.previewItem
                      }
                    >
                      <Icon />

                      <strong>
                        {
                          announcement.text
                        }
                      </strong>

                      <span>
                        ⚾
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <p
              className={
                styles.emptyPreview
              }
            >
              No hay anuncios activos.
            </p>
          )}
        </div>
      </section>

      <section
        className={
          styles.listSection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              Contenido
            </span>

            <h2>
              Anuncios guardados
            </h2>

            <p>
              Cambia el orden, edita,
              activa o elimina cada
              anuncio.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.restoreButton
            }
            onClick={
              restoreDefaults
            }
          >
            <RotateCcw />

            Restaurar ejemplos
          </button>
        </div>

        <div
          className={
            styles.announcementList
          }
        >
          {announcements.map(
            (
              announcement,
              index
            ) => {
              const Icon =
                iconMap[
                  announcement.icon
                ];

              return (
                <article
                  key={
                    announcement.id
                  }
                  className={
                    announcement.active
                      ? styles.announcementCard
                      : styles.announcementCardInactive
                  }
                >
                  <div
                    className={
                      styles.orderNumber
                    }
                  >
                    {index + 1}
                  </div>

                  <div
                    className={
                      styles.announcementIcon
                    }
                  >
                    <Icon />
                  </div>

                  <div
                    className={
                      styles.announcementContent
                    }
                  >
                    <strong>
                      {
                        announcement.text
                      }
                    </strong>

                    <span>
                      {announcement.active
                        ? "Visible en la cinta"
                        : "Oculto"}
                    </span>
                  </div>

                  <div
                    className={
                      styles.cardActions
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        moveAnnouncement(
                          index,
                          "up"
                        )
                      }
                      disabled={
                        index === 0
                      }
                      aria-label="Subir anuncio"
                      title="Subir"
                    >
                      <ArrowUp />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moveAnnouncement(
                          index,
                          "down"
                        )
                      }
                      disabled={
                        index ===
                        announcements.length -
                          1
                      }
                      aria-label="Bajar anuncio"
                      title="Bajar"
                    >
                      <ArrowDown />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleAnnouncement(
                          announcement.id
                        )
                      }
                      aria-label={
                        announcement.active
                          ? "Desactivar anuncio"
                          : "Activar anuncio"
                      }
                      title={
                        announcement.active
                          ? "Desactivar"
                          : "Activar"
                      }
                    >
                      {announcement.active ? (
                        <Eye />
                      ) : (
                        <EyeOff />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        editAnnouncement(
                          announcement
                        )
                      }
                      aria-label="Editar anuncio"
                      title="Editar"
                    >
                      <Pencil />
                    </button>

                    <button
                      type="button"
                      className={
                        styles.deleteButton
                      }
                      onClick={() =>
                        deleteAnnouncement(
                          announcement.id
                        )
                      }
                      aria-label="Eliminar anuncio"
                      title="Eliminar"
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
