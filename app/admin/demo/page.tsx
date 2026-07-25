"use client";

import {
  Clock3,
  Gift,
  RefreshCcw,
  RotateCcw,
  Settings2,
  ShieldCheck,
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
import styles from "./Demo.module.css";

const COLLECTED_STORAGE_KEY =
  "hrr-collected-rewards";

const COOLDOWN_STORAGE_KEY =
  "hrr-reward-cooldowns";

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
    setConfig(
      readDemoConfig()
    );
  }, []);

  function updateFlag(
    flag: keyof DemoConfig,
    value: boolean
  ) {
    const nextConfig = {
      ...config,
      [flag]: value,
    };

    setConfig(nextConfig);
    saveDemoConfig(nextConfig);

    setSavedMessage(
      "Configuración actualizada."
    );

    window.setTimeout(() => {
      setSavedMessage("");
    }, 2200);
  }

  function enableAllRules() {
    setConfig(
      DEFAULT_DEMO_CONFIG
    );

    saveDemoConfig(
      DEFAULT_DEMO_CONFIG
    );

    setSavedMessage(
      "Todas las reglas fueron activadas."
    );
  }

  function disableAllRules() {
    const nextConfig: DemoConfig = {
      enable24HourCooldown: false,
      blockAlreadyCollectedRewards: false,
    };

    setConfig(nextConfig);
    saveDemoConfig(nextConfig);

    setSavedMessage(
      "Modo demo libre activado."
    );
  }

  function clearDemoProgress() {
    window.localStorage.removeItem(
      COLLECTED_STORAGE_KEY
    );

    window.localStorage.removeItem(
      COOLDOWN_STORAGE_KEY
    );

    setSavedMessage(
      "Premios y bloqueos de la demo fueron reiniciados."
    );
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
