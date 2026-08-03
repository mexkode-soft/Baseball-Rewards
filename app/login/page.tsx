"use client";

import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import LoginBaseballScene from "@/components/LoginBaseballScene";
import { getCurrentRole, getSupabaseConfigStatus, hasSupabaseConfig, supabase } from "@/lib/supabase";
import styles from "./Login.module.css";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function goHome() {
    const role = await getCurrentRole();
    router.push(role === "admin" ? "/admin" : "/usuario");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!hasSupabaseConfig) {
      setError("Supabase no está configurado en este entorno.");
      setLoading(false);
      return;
    }

    if (mode === "register") {
      const { error: registerError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (registerError) {
        setError(registerError.message);
      } else {
        setMessage("Cuenta creada. Revisa tu correo para confirmar el registro.");
      }
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError("El correo o la contraseña son incorrectos.");
      setLoading(false);
      return;
    }

    await goHome();
  }

  async function loginWithGoogle() {
    setError("");
    if (!hasSupabaseConfig) {
      const status = getSupabaseConfigStatus();
      setError(
        !status.hasUrl
          ? "Falta NEXT_PUBLIC_SUPABASE_URL en .env.local."
          : !status.hasKey
            ? "Falta la clave pública de Supabase en .env.local."
            : "La configuración de Supabase no es válida."
      );
      return;
    }

    // Fuerza a Google a mostrar el selector de cuentas incluso dentro de la PWA.
    // Así el usuario no queda atrapado en la última cuenta utilizada.
    await supabase.auth.signOut({ scope: "local" });

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (oauthError) setError(oauthError.message);
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginVisual}>
        <div className={styles.visualInner}>
          <LoginBaseballScene />
          <span className={styles.visualEyebrow}>Home Run Rewards</span>
          <h2 className={styles.visualTitle}>Juega, participa y gana</h2>
          <p className={styles.visualDescription}>Una plataforma para verdaderos fanáticos del béisbol.</p>
          <div className={styles.visualFeature}><div className={styles.featureIcon}><ShieldCheck /></div><div><strong>Acceso seguro</strong><p>Tu cuenta y recompensas se protegen con Supabase Auth.</p></div></div>
        </div>
      </section>

      <section className={styles.loginFormSection}>
        <div className={styles.formContainer}>
          <img src="/images/logo-home-run.png" alt="Home Run Rewards" className={styles.formLogo} />
          <div className={styles.loginCard}>
            <div className={styles.topActions}><Link href="/" className={styles.back}><ArrowLeft /><span>Regresar</span></Link><span className={styles.badge}>{mode === "login" ? "Acceso" : "Registro"}</span></div>
            <h1 className={styles.title}>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
            <p className={styles.subtitle}>{mode === "login" ? "Ingresa para continuar." : "Regístrate con correo o con tu cuenta de Google."}</p>

            <form className={styles.form} onSubmit={submit}>
              <label className={styles.label}>Correo electrónico<div className={styles.inputWrap}><Mail /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@gmail.com" autoComplete="email" required /></div></label>
              <label className={styles.label}>Contraseña<div className={styles.inputWrap}><LockKeyhole /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></div></label>
              {error && <p className={styles.error}>{error}</p>}
              {message && <p className={styles.demoText}>{message}</p>}
              <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}</button>
              <div className={styles.divider}><span>o</span></div>
              <button type="button" className={styles.googleButton} onClick={loginWithGoogle}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.18c0-.67-.06-1.17-.19-1.69H12v3.07h5.38a4.6 4.6 0 0 1-2 3.02l-.02.1 2.91 2.25.2.02c1.84-1.7 2.88-4.2 2.88-6.77Z"/><path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.75l-3.07-2.37c-.82.55-1.9.94-3.38.94-2.53 0-4.68-1.7-5.45-4.07l-.1.01-3.03 2.34-.04.1A9.74 9.74 0 0 0 12 21.7Z"/><path fill="#FBBC05" d="M6.55 13.45A5.86 5.86 0 0 1 6.23 12c0-.5.09-.98.31-1.45v-.1L3.48 8.08l-.1.05A9.67 9.67 0 0 0 2.3 12c0 1.4.39 2.72 1.08 3.87l3.17-2.42Z"/><path fill="#EA4335" d="M12 6.48c1.83 0 3.06.79 3.76 1.44l2.76-2.7C16.83 3.65 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.62 5.83l3.16 2.42C7.32 8.18 9.47 6.48 12 6.48Z"/></svg>
                {mode === "login" ? "Entrar con Google" : "Crear cuenta con Google"}
              </button>
              <button type="button" className={styles.back} onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}</button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
