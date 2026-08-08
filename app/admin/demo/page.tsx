"use client";

import {
  Clock3,
  Gift,
  RefreshCcw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  MapPin,
  Sparkles,
  Trash2,
  Search,
  Check,
  Users,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_DEMO_CONFIG,
  readDemoConfig,
  saveDemoConfig,
  readDemoDirectory,
  readDemoUserIds,
  saveDemoUserIds,
  type DemoConfig,
  type DemoUser,
} from "@/lib/demoConfig";
import { supabase } from "@/lib/supabase";
import styles from "./Demo.module.css";

export default function DemoPage() {
  const [
    config,
    setConfig,
  ] = useState<DemoConfig>(
    DEFAULT_DEMO_CONFIG
  );

  const [
    savedMessage,
    setSavedMessage,
  ] = useState("");
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [selectedDemoUserIds, setSelectedDemoUserIds] = useState<string[]>([]);
  const [demoSearch, setDemoSearch] = useState("");
  const [savingUsers, setSavingUsers] = useState(false);

  useEffect(() => {
    void readDemoConfig().then(setConfig).catch(() => setConfig(DEFAULT_DEMO_CONFIG));
    void Promise.all([readDemoDirectory(), readDemoUserIds()])
      .then(([directory, selectedIds]) => { setDemoUsers(directory); setSelectedDemoUserIds(selectedIds); })
      .catch((error) => setSavedMessage(error instanceof Error ? error.message : "No se pudieron cargar los usuarios demo."));
  }, []);

  async function updateFlag(
    flag: keyof DemoConfig,
    value: boolean
  ) {
    const nextConfig = {
      ...config,
      [flag]: value,
    };

    setConfig(nextConfig);
    await saveDemoConfig(nextConfig);

    setSavedMessage(
      "Configuración actualizada."
    );

    window.setTimeout(() => {
      setSavedMessage("");
    }, 2200);
  }

  async function updateSimulatedLocation(patch: Partial<DemoConfig>) {
    const nextConfig = { ...config, ...patch };
    setConfig(nextConfig);
    await saveDemoConfig(nextConfig);
    setSavedMessage("Ubicación simulada actualizada.");
    window.setTimeout(() => setSavedMessage(""), 2200);
  }

  async function enableAllRules() {
    const nextConfig: DemoConfig = {
      ...config,
      enable24HourCooldown: true,
      blockAlreadyCollectedRewards: true,
    };

    setConfig(nextConfig);
    await saveDemoConfig(nextConfig);

    setSavedMessage(
      "Todas las reglas fueron activadas."
    );
  }

  async function disableAllRules() {
    const nextConfig: DemoConfig = {
      ...config,
      enable24HourCooldown: false,
      blockAlreadyCollectedRewards: false,
    };

    setConfig(nextConfig);
    await saveDemoConfig(nextConfig);

    setSavedMessage(
      "Modo demo libre activado."
    );
  }

  async function clearDemoProgress() {
    const { error } = await supabase.rpc("reset_demo_progress");
    setSavedMessage(error ? error.message : "Los datos temporales de los usuarios demo seleccionados fueron eliminados.");
  }

  async function toggleDemoUser(userId: string) {
    const checked = selectedDemoUserIds.includes(userId);
    const next = checked
      ? selectedDemoUserIds.filter((id) => id !== userId)
      : [...selectedDemoUserIds, userId].slice(0, 10);
    if (!checked && selectedDemoUserIds.length >= 10) {
      setSavedMessage("Puedes habilitar Demo para un máximo de 10 usuarios.");
      return;
    }
    setSelectedDemoUserIds(next);
    setSavingUsers(true);
    try {
      await saveDemoUserIds(next);
      setSavedMessage(`Usuarios demo actualizados: ${next.length}/10.`);
    } catch (error) {
      setSelectedDemoUserIds(selectedDemoUserIds);
      setSavedMessage(error instanceof Error ? error.message : "No se pudieron actualizar los usuarios demo.");
    } finally {
      setSavingUsers(false);
      window.setTimeout(() => setSavedMessage(""), 2200);
    }
  }

  return (
    <>
      <div
        className={
          styles.pageTitle
        }
      >
        <span>
          Configuración administrativa
        </span>

        <h1>
          Demo
        </h1>

        <p>
          Activa o desactiva las
          reglas que necesitas para
          cada presentación sin
          modificar el código.
        </p>
      </div>

      <section
        className={
          styles.summaryCard
        }
      >
        <div
          className={
            styles.summaryIcon
          }
        >
          <Settings2 />
        </div>

        <div>
          <span>
            Estado actual
          </span>

          <h2>
            {config.enable24HourCooldown ||
            config.blockAlreadyCollectedRewards
              ? "Demo con restricciones"
              : "Demo libre"}
          </h2>

          <p>
            Los cambios se aplican
            automáticamente en Cazar
            recompensas.
          </p>
        </div>

        <div
          className={
            styles.summaryStatus
          }
        >
          <Sparkles />

          {
            Object.values(
              config
            ).filter(Boolean)
              .length
          }{" "}
          reglas activas
        </div>
      </section>

      <div
        className={
          styles.rulesGrid
        }
      >
        <article
          className={
            styles.ruleCard
          }
        >
          <div
            className={
              styles.ruleHeader
            }
          >
            <div
              className={
                styles.ruleIcon
              }
            >
              <Clock3 />
            </div>

            <span
              className={`${styles.statusBadge} ${
                config.enable24HourCooldown
                  ? styles.enabledBadge
                  : styles.disabledBadge
              }`}
            >
              {config.enable24HourCooldown
                ? "Activada"
                : "Desactivada"}
            </span>
          </div>

          <h2>
            Espera de 24 horas
          </h2>

          <p>
            Cuando el usuario falla
            la trivia, no puede volver
            a intentar ese mismo
            premio hasta que pasen 24
            horas.
          </p>

          <label
            className={
              styles.switchRow
            }
          >
            <div>
              <strong>
                Aplicar bloqueo
              </strong>

              <span>
                Desactívalo para repetir
                intentos inmediatamente.
              </span>
            </div>

            <input
              type="checkbox"
              checked={
                config.enable24HourCooldown
              }
              onChange={(event) =>
                updateFlag(
                  "enable24HourCooldown",
                  event.target.checked
                )
              }
            />

            <span
              className={
                styles.switch
              }
              aria-hidden="true"
            />
          </label>
        </article>

        <article
          className={
            styles.ruleCard
          }
        >
          <div
            className={
              styles.ruleHeader
            }
          >
            <div
              className={
                styles.ruleIcon
              }
            >
              <ShieldCheck />
            </div>

            <span
              className={`${styles.statusBadge} ${
                config.blockAlreadyCollectedRewards
                  ? styles.enabledBadge
                  : styles.disabledBadge
              }`}
            >
              {config.blockAlreadyCollectedRewards
                ? "Activada"
                : "Desactivada"}
            </span>
          </div>

          <h2>
            Un premio por usuario
          </h2>

          <p>
            Cuando el usuario ya ganó
            y recibió el código de un
            premio, no puede volver a
            participar por ese mismo
            premio.
          </p>

          <label
            className={
              styles.switchRow
            }
          >
            <div>
              <strong>
                Bloquear premios
                ganados
              </strong>

              <span>
                Desactívalo para mostrar
                la dinámica varias veces.
              </span>
            </div>

            <input
              type="checkbox"
              checked={
                config.blockAlreadyCollectedRewards
              }
              onChange={(event) =>
                updateFlag(
                  "blockAlreadyCollectedRewards",
                  event.target.checked
                )
              }
            />

            <span
              className={
                styles.switch
              }
              aria-hidden="true"
            />
          </label>
        </article>
      </div>

      <section className={styles.simulatedLocationCard}>
        <div className={styles.simulatedLocationHeading}>
          <div className={styles.ruleIcon}><MapPin /></div>
          <div>
            <span>Ubicación para demostraciones</span>
            <h2>Simular que el usuario está en un lugar</h2>
            <p>Cuando está activa, la dinámica de mapa usa estas coordenadas en lugar del GPS real.</p>
          </div>
        </div>

        <label className={styles.switchRow}>
          <div><strong>Activar ubicación simulada</strong><span>Ideal para presentar la demo desde una computadora.</span></div>
          <input type="checkbox" checked={config.simulatedLocationEnabled} onChange={(event) => updateSimulatedLocation({ simulatedLocationEnabled: event.target.checked })} />
          <span className={styles.switch} aria-hidden="true" />
        </label>

        <div className={styles.locationInputs}>
          <label>Latitud<input type="number" step="any" value={config.simulatedLatitude} onChange={(event) => updateSimulatedLocation({ simulatedLatitude: Number(event.target.value) })} /></label>
          <label>Longitud<input type="number" step="any" value={config.simulatedLongitude} onChange={(event) => updateSimulatedLocation({ simulatedLongitude: Number(event.target.value) })} /></label>
        </div>
        <p className={styles.locationHint}>Copia aquí las coordenadas de cualquiera de los premios configurados para simular que ya llegaste.</p>
      </section>

      <section className={styles.demoUsersCard}>
        <div className={styles.demoUsersHeading}>
          <div className={styles.ruleIcon}><Users /></div>
          <div>
            <span>Usuarios habilitados</span>
            <h2>¿Quién puede usar el modo Demo?</h2>
            <p>La ubicación simulada, puntos temporales y premios Demo solo aplican a estas cuentas. Máximo 10 usuarios.</p>
          </div>
          <strong className={styles.demoUserCounter}>{selectedDemoUserIds.length}/10</strong>
        </div>
        <label className={styles.demoUserSearch}>
          <Search aria-hidden="true" />
          <input value={demoSearch} onChange={(event) => setDemoSearch(event.target.value)} placeholder="Buscar por nombre o correo" />
        </label>
        <div className={styles.demoUserList}>
          {demoUsers
            .filter((user) => `${user.fullName} ${user.email}`.toLowerCase().includes(demoSearch.toLowerCase()))
            .map((user) => {
              const checked = selectedDemoUserIds.includes(user.id);
              const initials = (user.fullName || user.email || "U").split(/\s+/).slice(0,2).map((part)=>part.charAt(0).toUpperCase()).join("");
              return <button type="button" key={user.id} disabled={savingUsers || (!checked && selectedDemoUserIds.length >= 10)} className={`${styles.demoUserOption} ${checked ? styles.demoUserSelected : ""}`} onClick={() => void toggleDemoUser(user.id)}>
                <span className={styles.demoUserAvatar}>{initials}</span>
                <span className={styles.demoUserIdentity}><strong>{user.fullName || "Usuario"}</strong><small>{user.email}</small></span>
                <span className={styles.demoUserRole}>{user.role}</span>
                <span className={styles.demoUserCheck}>{checked ? <Check size={17}/> : null}</span>
              </button>;
            })}
        </div>
      </section>

      <section
        className={
          styles.actionsCard
        }
      >
        <div>
          <span>
            Acciones rápidas
          </span>

          <h2>
            Preparar presentación
          </h2>

          <p>
            Cambia todas las reglas o
            limpia el progreso guardado
            en este navegador.
          </p>
        </div>

        <div
          className={
            styles.actions
          }
        >
          <button
            type="button"
            className={
              styles.primaryButton
            }
            onClick={
              disableAllRules
            }
          >
            <Gift />

            Activar demo libre
          </button>

          <button
            type="button"
            onClick={
              enableAllRules
            }
          >
            <RefreshCcw />

            Activar reglas
          </button>

          <button
            type="button"
            className={
              styles.dangerButton
            }
            onClick={
              clearDemoProgress
            }
          >
            <Trash2 />

            Limpiar datos de demo
          </button>
        </div>
      </section>

      {savedMessage && (
        <div
          className={
            styles.toast
          }
          role="status"
        >
          <RotateCcw />

          {savedMessage}
        </div>
      )}
    </>
  );
}
