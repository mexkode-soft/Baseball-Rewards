"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getCurrentRole } from "@/lib/supabase";

export default function Page() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        const response = await fetch("/api/sponsor/activate", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "No se pudo activar la cuenta patrocinador.");
      }

      setMessage("Contraseña actualizada. Tu cuenta quedó activada.");
      const role = await getCurrentRole();
      router.replace(role === "admin" ? "/admin" : role === "sponsor" ? "/patrocinador" : "/usuario");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la contraseña.");
    } finally {
      setSaving(false);
    }
  }

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#07080a", color: "white", padding: 24 }}>
    <form onSubmit={submit} style={{ width: "min(440px,100%)", display: "grid", gap: 16, background: "#101216", padding: 28, borderRadius: 20, border: "1px solid #2b2d33" }}>
      <h1>Nueva contraseña</h1>
      <p style={{ margin: 0, color: "#aeb2ba", lineHeight: 1.5 }}>Define tu contraseña para terminar el registro y activar tu cuenta de patrocinador.</p>
      <input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Mínimo 8 caracteres" style={{ padding: 14, borderRadius: 12 }} />
      <button disabled={saving} style={{ padding: 14, borderRadius: 12, background: "#f4c542", fontWeight: 800 }}>{saving ? "Activando…" : "Guardar contraseña y activar"}</button>
      {message && <p>{message}</p>}
    </form>
  </main>;
}
