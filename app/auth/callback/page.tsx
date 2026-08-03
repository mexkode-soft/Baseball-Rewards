"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";

type ProfileRole = "admin" | "usuario" | "sponsor";
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Validando tu cuenta...");
  useEffect(() => {
    let cancelled = false;
    async function completeLogin() {
      if (!hasSupabaseConfig) { setMessage("Supabase no está configurado."); window.setTimeout(() => window.location.replace("/login"), 1800); return; }
      const supabase = createSupabaseBrowserClient();
      try {
        const currentUrl = new URL(window.location.href);
        const code = currentUrl.searchParams.get("code");
        if (code) {
          setMessage("Confirmando el acceso...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error && !error.message.toLowerCase().includes("code verifier")) throw error;
          currentUrl.searchParams.delete("code");
          currentUrl.searchParams.delete("state");
          window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
        }

        let session = null;
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < 8 && !session; attempt += 1) {
          const result = await supabase.auth.getSession();
          session = result.data.session;
          if (result.error) lastError = result.error;
          if (!session) await wait(450 + attempt * 150);
        }
        if (!session?.user) throw lastError ?? new Error("No se pudo recuperar la sesión. Cierra la PWA y vuelve a iniciar sesión.");

        let role: ProfileRole = "usuario";
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
          if (!error && profile) { if (profile.role === "admin") role = "admin"; else if (profile.role === "sponsor") role = "sponsor"; break; }
          await wait(400);
        }
        if (cancelled) return;
        setMessage("Acceso correcto. Redirigiendo...");
        window.location.replace(role === "admin" ? "/admin" : role === "sponsor" ? "/patrocinador" : "/usuario");
      } catch (error) {
        console.error("Error del callback:", error);
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "No fue posible completar el inicio de sesión.");
        window.setTimeout(() => window.location.replace("/login"), 5000);
      }
    }
    void completeLogin();
    return () => { cancelled = true; };
  }, []);
  return <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, background: "#07080a", color: "#fff", textAlign: "center" }}><section><img src="/images/logo-home-run.png" alt="Home Run Rewards" style={{ width: "min(280px,72vw)", height: "auto", objectFit: "contain", marginBottom: 24 }} /><p>{message}</p></section></main>;
}
