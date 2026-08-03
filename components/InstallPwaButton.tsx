"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./InstallPwaButton.module.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setInstalled(isStandalone());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setMessage("");
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setMessage("Aplicación instalada correctamente.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setMessage("Instalando Home Run Rewards…");
      }
      setInstallPrompt(null);
      return;
    }

    if (isIos()) {
      setMessage("En Safari toca Compartir y después “Agregar a pantalla de inicio”.");
      return;
    }

    setMessage("Abre esta página en Chrome y espera unos segundos. Después vuelve a tocar Instalar aplicación.");
  };

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.button} onClick={install}>
        <Download size={18} />
        Instalar aplicación
      </button>
      {message ? <p className={styles.message}>{message}</p> : null}
    </div>
  );
}
