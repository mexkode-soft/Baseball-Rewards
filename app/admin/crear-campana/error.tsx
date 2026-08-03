"use client";

import { useEffect } from "react";

export default function CreateCampaignError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Error en creador de campaña:", error); }, [error]);
  return (
    <section style={{ padding: 32, maxWidth: 760 }}>
      <h1>No fue posible cargar el editor</h1>
      <p style={{ color: "#b8bec9" }}>El mapa o la vista previa no pudieron inicializarse. Puedes reintentar sin perder la sesión.</p>
      <details style={{ margin: "18px 0", color: "#ffb3b3" }}><summary>Detalle técnico</summary><pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre></details>
      <button type="button" onClick={reset} style={{ border: 0, borderRadius: 12, padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}>Reintentar</button>
    </section>
  );
}
