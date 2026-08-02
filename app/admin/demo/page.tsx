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
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_DEMO_CONFIG,
  readDemoConfig,
  saveDemoConfig,
  type DemoConfig,
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

  useEffect(() => {
    void readDemoConfig().then(setConfig).catch(() => setConfig(DEFAULT_DEMO_CONFIG));
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
    setSavedMessage(error ? error.message : "Premios, puntos, tickets e intentos de la demo fueron reiniciados.");
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

            Reiniciar progreso
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
