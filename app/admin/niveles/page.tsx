"use client";

import {
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
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
  type Level,
  DEFAULT_LEVELS,
  getLevelByPoints,
  readLevels,
  saveLevels,
} from "@/lib/levels";

import styles from "./Niveles.module.css";

function createId() {
  if (
    typeof crypto !==
      "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `level-${Date.now()}`;
}

function formatRange(
  level: Level
) {
  if (
    level.maxPoints ===
    null
  ) {
    return `${level.minPoints} puntos o más`;
  }

  return `${level.minPoints} a ${level.maxPoints} puntos`;
}

export default function Page() {
  const [
    levels,
    setLevels,
  ] = useState<Level[]>(
    DEFAULT_LEVELS
  );

  const [
    name,
    setName,
  ] = useState("");

  const [
    minPoints,
    setMinPoints,
  ] = useState("0");

  const [
    maxPoints,
    setMaxPoints,
  ] = useState("");

  const [
    unlimited,
    setUnlimited,
  ] = useState(false);

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

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    testPoints,
    setTestPoints,
  ] = useState("250");

  useEffect(() => {
    void readLevels(true).then(setLevels).catch((error) => setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los niveles."));
  }, []);

  const activeLevels =
    useMemo(
      () =>
        levels.filter(
          (level) =>
            level.active
        ),
      [levels]
    );

  const testedLevel =
    useMemo(
      () =>
        getLevelByPoints(
          Number(testPoints),
          levels
        ),
      [
        testPoints,
        levels,
      ]
    );

  async function persist(
    nextLevels: Level[]
  ) {
    const ordered =
      [...nextLevels]
        .sort(
          (
            first,
            second
          ) =>
            first.minPoints -
            second.minPoints
        )
        .map(
          (
            level,
            index
          ) => ({
            ...level,
            order: index + 1,
          })
        );

    setLevels(ordered);
    await saveLevels(ordered);
  }

  function resetForm() {
    setName("");
    setMinPoints("0");
    setMaxPoints("");
    setUnlimited(false);
    setEditingId(null);
    setErrorMessage("");
  }

  function validateRange(
    currentId:
      | string
      | null,
    minimum: number,
    maximum:
      | number
      | null
  ) {
    if (
      minimum < 0
    ) {
      return "Los puntos mínimos no pueden ser negativos.";
    }

    if (
      maximum !== null &&
      maximum < minimum
    ) {
      return "Los puntos máximos deben ser mayores o iguales a los mínimos.";
    }

    const overlaps =
      levels.some(
        (level) => {
          if (
            level.id ===
            currentId
          ) {
            return false;
          }

          const currentMax =
            maximum ??
            Number.POSITIVE_INFINITY;

          const levelMax =
            level.maxPoints ??
            Number.POSITIVE_INFINITY;

          return (
            minimum <=
              levelMax &&
            currentMax >=
              level.minPoints
          );
        }
      );

    if (overlaps) {
      return "Este rango se cruza con otro nivel existente.";
    }

    return "";
  }

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    const trimmedName =
      name.trim();

    const parsedMin =
      Number(minPoints);

    const parsedMax =
      unlimited
        ? null
        : Number(maxPoints);

    if (!trimmedName) {
      setErrorMessage(
        "Escribe el nombre del nivel."
      );

      return;
    }

    if (
      !Number.isFinite(
        parsedMin
      )
    ) {
      setErrorMessage(
        "Los puntos mínimos no son válidos."
      );

      return;
    }

    if (
      !unlimited &&
      (
        maxPoints.trim() ===
          "" ||
        !Number.isFinite(
          parsedMax
        )
      )
    ) {
      setErrorMessage(
        "Escribe los puntos máximos o selecciona “Sin límite”."
      );

      return;
    }

    const validationError =
      validateRange(
        editingId,
        parsedMin,
        parsedMax
      );

    if (validationError) {
      setErrorMessage(
        validationError
      );

      return;
    }

    if (editingId) {
      void persist(
        levels.map(
          (level) =>
            level.id ===
            editingId
              ? {
                  ...level,
                  name:
                    trimmedName,
                  minPoints:
                    parsedMin,
                  maxPoints:
                    parsedMax,
                }
              : level
        )
      );

      setMessage(
        "Nivel actualizado correctamente."
      );
    } else {
      const newLevel:
        Level = {
        id: createId(),
        name: trimmedName,
        minPoints: parsedMin,
        maxPoints: parsedMax,
        active: true,
        order:
          levels.length + 1,
      };

      persist([
        ...levels,
        newLevel,
      ]);

      setMessage(
        "Nivel agregado correctamente."
      );
    }

    resetForm();
  }

  function editLevel(
    level: Level
  ) {
    setEditingId(level.id);
    setName(level.name);

    setMinPoints(
      String(
        level.minPoints
      )
    );

    setUnlimited(
      level.maxPoints ===
        null
    );

    setMaxPoints(
      level.maxPoints ===
        null
        ? ""
        : String(
            level.maxPoints
          )
    );

    setMessage("");
    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function toggleLevel(
    id: string
  ) {
    void persist(
      levels.map(
        (level) =>
          level.id === id
            ? {
                ...level,
                active:
                  !level.active,
              }
            : level
      )
    );
  }

  function deleteLevel(
    id: string
  ) {
    void persist(
      levels.filter(
        (level) =>
          level.id !== id
      )
    );

    if (
      editingId === id
    ) {
      resetForm();
    }
  }

  function moveLevel(
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
        levels.length
    ) {
      return;
    }

    const reordered = [
      ...levels,
    ];

    [
      reordered[index],
      reordered[targetIndex],
    ] = [
      reordered[targetIndex],
      reordered[index],
    ];

    const adjusted =
      reordered.map(
        (
          level,
          itemIndex
        ) => ({
          ...level,
          order:
            itemIndex + 1,
        })
      );

    setLevels(adjusted);
    saveLevels(adjusted);
  }

  function restoreDefaults() {
    void persist(
      DEFAULT_LEVELS
    );

    resetForm();

    setMessage(
      "Niveles predeterminados restaurados."
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
            Niveles
          </h1>

          <p>
            Define los rangos de
            puntos que clasificarán
            automáticamente a cada
            usuario.
          </p>
        </div>

        <div
          className={
            styles.headerCounter
          }
        >
          <Trophy />

          <strong>
            {
              activeLevels.length
            }
          </strong>

          <span>
            niveles activos
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
                ? "Editar nivel"
                : "Crear nivel"}
            </h2>

            <p>
              Indica el nombre y el
              rango de puntos que le
              corresponde.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              className={
                styles.secondaryButton
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
          <label>
            <span>
              Nombre del nivel
            </span>

            <input
              type="text"
              value={name}
              onChange={(
                event
              ) =>
                setName(
                  event.target
                    .value
                )
              }
              placeholder="Ej. Novato"
              maxLength={35}
            />
          </label>

          <label>
            <span>
              Puntos mínimos
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={minPoints}
              onChange={(
                event
              ) =>
                setMinPoints(
                  event.target
                    .value
                )
              }
            />
          </label>

          <label>
            <span>
              Puntos máximos
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={maxPoints}
              disabled={
                unlimited
              }
              onChange={(
                event
              ) =>
                setMaxPoints(
                  event.target
                    .value
                )
              }
              placeholder={
                unlimited
                  ? "Sin límite"
                  : "Ej. 200"
              }
            />
          </label>

          <label
            className={
              styles.unlimitedOption
            }
          >
            <input
              type="checkbox"
              checked={
                unlimited
              }
              onChange={(
                event
              ) => {
                setUnlimited(
                  event.target
                    .checked
                );

                if (
                  event.target
                    .checked
                ) {
                  setMaxPoints(
                    ""
                  );
                }
              }}
            />

            <span>
              Sin límite máximo
            </span>
          </label>

          <button
            type="submit"
            className={
              styles.primaryButton
            }
          >
            {editingId ? (
              <Save />
            ) : (
              <Plus />
            )}

            {editingId
              ? "Guardar cambios"
              : "Agregar nivel"}
          </button>
        </form>

        {errorMessage && (
          <div
            className={
              styles.errorMessage
            }
          >
            <ShieldAlert />

            {errorMessage}
          </div>
        )}

        {message && (
          <div
            className={
              styles.successMessage
            }
          >
            <Check />

            {message}
          </div>
        )}
      </section>

      <section
        className={
          styles.testSection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              Simulador
            </span>

            <h2>
              Probar clasificación
            </h2>

            <p>
              Escribe una cantidad de
              puntos para verificar
              qué nivel recibiría el
              usuario.
            </p>
          </div>
        </div>

        <div
          className={
            styles.testGrid
          }
        >
          <label>
            <span>
              Puntos del usuario
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={testPoints}
              onChange={(
                event
              ) =>
                setTestPoints(
                  event.target
                    .value
                )
              }
            />
          </label>

          <div
            className={
              testedLevel
                ? styles.testResult
                : styles.testResultEmpty
            }
          >
            <Award />

            <div>
              <span>
                Nivel obtenido
              </span>

              <strong>
                {testedLevel
                  ? testedLevel.name
                  : "Sin clasificación"}
              </strong>

              <small>
                {testedLevel
                  ? formatRange(
                      testedLevel
                    )
                  : "No existe un rango activo para estos puntos."}
              </small>
            </div>
          </div>
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
              Tabla maestra
            </span>

            <h2>
              Niveles configurados
            </h2>

            <p>
              Estos rangos serán
              consultados cuando un
              usuario gane puntos.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.secondaryButton
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
            styles.levelList
          }
        >
          {levels.map(
            (
              level,
              index
            ) => (
              <article
                key={
                  level.id
                }
                className={
                  level.active
                    ? styles.levelCard
                    : styles.levelCardInactive
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
                    styles.levelIcon
                  }
                >
                  <Award />
                </div>

                <div
                  className={
                    styles.levelInfo
                  }
                >
                  <strong>
                    {level.name}
                  </strong>

                  <span>
                    {
                      formatRange(
                        level
                      )
                    }
                  </span>

                  <small>
                    {level.active
                      ? "Nivel activo"
                      : "Nivel desactivado"}
                  </small>
                </div>

                <div
                  className={
                    styles.cardActions
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      moveLevel(
                        index,
                        "up"
                      )
                    }
                    disabled={
                      index === 0
                    }
                    title="Subir"
                    aria-label="Subir nivel"
                  >
                    <ChevronUp />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      moveLevel(
                        index,
                        "down"
                      )
                    }
                    disabled={
                      index ===
                      levels.length -
                        1
                    }
                    title="Bajar"
                    aria-label="Bajar nivel"
                  >
                    <ChevronDown />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleLevel(
                        level.id
                      )
                    }
                    title={
                      level.active
                        ? "Desactivar"
                        : "Activar"
                    }
                    aria-label={
                      level.active
                        ? "Desactivar nivel"
                        : "Activar nivel"
                    }
                  >
                    {level.active ? (
                      <Eye />
                    ) : (
                      <EyeOff />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      editLevel(
                        level
                      )
                    }
                    title="Editar"
                    aria-label="Editar nivel"
                  >
                    <Pencil />
                  </button>

                  <button
                    type="button"
                    className={
                      styles.deleteButton
                    }
                    onClick={() =>
                      deleteLevel(
                        level.id
                      )
                    }
                    title="Eliminar"
                    aria-label="Eliminar nivel"
                  >
                    <Trash2 />
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
