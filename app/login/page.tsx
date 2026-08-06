"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginBaseballScene from "@/components/LoginBaseballScene";
import { getCurrentRole, getSupabaseConfigStatus, hasSupabaseConfig, supabase } from "@/lib/supabase";
import { getStateCode, LMB_TEAMS, MEXICO_STATES } from "@/lib/mexicoCatalog";
import styles from "./Login.module.css";

const LEGAL_VERSION = "1.0";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (mode !== "register") return;
    const code = getStateCode(state);
    if (!code) { setMunicipalities([]); setMunicipality(""); return; }
    const controller = new AbortController();
    setMunicipalitiesLoading(true);
    fetch(`/api/geo/municipalities?state=${code}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { municipalities?: string[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "No fue posible cargar los municipios.");
        setMunicipalities(payload.municipalities ?? []);
      })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "No fue posible cargar los municipios."); })
      .finally(() => { if (!controller.signal.aborted) setMunicipalitiesLoading(false); });
    return () => controller.abort();
  }, [state, mode]);

  async function goHome() {
    const role = await getCurrentRole();
    router.push(role === "admin" ? "/admin" : role === "sponsor" ? "/patrocinador" : "/usuario");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    if (!hasSupabaseConfig) { setError("Supabase no está configurado en este entorno."); setLoading(false); return; }

    if (mode === "register") {
      if (password !== confirmPassword) { setError("Las contraseñas no coinciden."); setLoading(false); return; }
      if (!fullName.trim() || !phone.trim() || !state || !municipality || !favoriteTeam) { setError("Completa todos los datos del registro."); setLoading(false); return; }
      if (!acceptPrivacy || !acceptTerms) { setError("Debes aceptar el Aviso de Privacidad y los Términos y Condiciones."); setLoading(false); return; }

      const acceptedAt = new Date().toISOString();
      const { error: registerError } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim(), phone: phone.trim(), state, municipality,
            favorite_team: favoriteTeam, registration_completed: true,
            privacy_accepted_version: LEGAL_VERSION, privacy_accepted_at: acceptedAt,
            terms_accepted_version: LEGAL_VERSION, terms_accepted_at: acceptedAt,
          },
        },
      });
      if (registerError) setError(registerError.message);
      else setMessage("Cuenta creada. Revisa tu correo para confirmar el registro.");
      setLoading(false); return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError) { setError("El correo o la contraseña son incorrectos."); setLoading(false); return; }
    await goHome();
  }

  async function loginWithGoogle() {
    if (googleLoading) return; setGoogleLoading(true); setError("");
    if (!hasSupabaseConfig) {
      const status = getSupabaseConfigStatus();
      setError(!status.hasUrl ? "Falta NEXT_PUBLIC_SUPABASE_URL en .env.local." : !status.hasKey ? "Falta la clave pública de Supabase en .env.local." : "La configuración de Supabase no es válida.");
      setGoogleLoading(false); return;
    }
    await supabase.auth.signOut({ scope: "local" });
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?origen=google`, queryParams: { prompt: "select_account" } },
    });
    if (oauthError) { setError(oauthError.message); setGoogleLoading(false); }
  }

  const registering = mode === "register";
  return (
    <main className={`${styles.loginPage} ${registering ? styles.registerPage : ""}`}>
      <section className={styles.loginVisual}><div className={styles.visualInner}><LoginBaseballScene /><span className={styles.visualEyebrow}>Home Run Rewards</span><h2 className={styles.visualTitle}>Juega, participa y gana</h2><p className={styles.visualDescription}>Una plataforma para verdaderos fanáticos del béisbol.</p><div className={styles.visualFeature}><div className={styles.featureIcon}><ShieldCheck /></div><div><strong>Acceso seguro</strong><p>Tu cuenta y recompensas se protegen con Supabase Auth.</p></div></div></div></section>
      <section className={styles.loginFormSection}><div className={styles.formContainer}><img src="/images/logo-home-run.png" alt="Home Run Rewards" className={styles.formLogo} /><div className={styles.loginCard}>
        <div className={styles.topActions}><Link href="/" className={styles.back}><ArrowLeft /><span>Regresar</span></Link><span className={styles.badge}>{registering ? "Registro" : "Acceso"}</span></div>
        <h1 className={styles.title}>{registering ? "Crear cuenta" : "Iniciar sesión"}</h1><p className={styles.subtitle}>{registering ? "Completa tu perfil para disfrutar todas las dinámicas." : "Ingresa para continuar."}</p>
        <form className={styles.form} onSubmit={submit}>
          {registering && <div className={styles.registrationGrid}>
            <label className={styles.label}>Nombre completo<div className={styles.inputWrap}><UserRound /><input value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="Nombre y apellidos" required /></div></label>
            <label className={styles.label}>Teléfono<div className={styles.inputWrap}><Phone /><input type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="10 dígitos" minLength={10} required /></div></label>
          </div>}
          <label className={styles.label}>Correo electrónico<div className={styles.inputWrap}><Mail /><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="correo@gmail.com" autoComplete="email" required /></div></label>
          {registering && <div className={styles.registrationGrid}>
            <label className={styles.label}>Estado<div className={styles.inputWrap}><MapPin /><select value={state} onChange={(e)=>{setState(e.target.value);setMunicipality("");}} required><option value="">Selecciona un estado</option>{MEXICO_STATES.map((item)=><option key={item.code} value={item.name}>{item.name}</option>)}</select></div></label>
            <label className={styles.label}>Municipio<div className={styles.inputWrap}><MapPin /><select value={municipality} onChange={(e)=>setMunicipality(e.target.value)} disabled={!state || municipalitiesLoading} required><option value="">{municipalitiesLoading ? "Cargando..." : "Selecciona un municipio"}</option>{municipalities.map((item)=><option key={item} value={item}>{item}</option>)}</select></div></label>
            <label className={`${styles.label} ${styles.fullWidth}`}>Equipo favorito<div className={styles.inputWrap}><ShieldCheck /><select value={favoriteTeam} onChange={(e)=>setFavoriteTeam(e.target.value)} required><option value="">Selecciona tu equipo favorito</option>{LMB_TEAMS.map((team)=><option key={team} value={team}>{team}</option>)}</select></div></label>
          </div>}
          <div className={registering ? styles.registrationGrid : undefined}>
            <label className={styles.label}>Contraseña<div className={styles.inputWrap}><LockKeyhole /><input type={showPassword ? "text" : "password"} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete={registering ? "new-password" : "current-password"} minLength={8} required /><button type="button" className={styles.passwordToggle} onClick={()=>setShowPassword((v)=>!v)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff/> : <Eye/>}</button></div></label>
            {registering && <label className={styles.label}>Confirmar contraseña<div className={styles.inputWrap}><LockKeyhole /><input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Repite tu contraseña" autoComplete="new-password" minLength={8} required /><button type="button" className={styles.passwordToggle} onClick={()=>setShowConfirmPassword((v)=>!v)} aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showConfirmPassword ? <EyeOff/> : <Eye/>}</button></div></label>}
          </div>
          {registering && <div className={styles.legalChecks}>
            <label><input type="checkbox" checked={acceptPrivacy} onChange={(e)=>setAcceptPrivacy(e.target.checked)} /> He leído y acepto el <Link href="/aviso-de-privacidad" target="_blank">Aviso de Privacidad</Link>.</label>
            <label><input type="checkbox" checked={acceptTerms} onChange={(e)=>setAcceptTerms(e.target.checked)} /> Acepto los <Link href="/terminos-y-condiciones" target="_blank">Términos y Condiciones</Link>.</label>
          </div>}
          {error && <p className={styles.error}>{error}</p>}{message && <p className={styles.demoText}>{message}</p>}
          <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? "Procesando..." : registering ? "Crear cuenta" : "Entrar"}</button>
          {!registering && <Link href="/recuperar-contrasena" className={styles.back}>¿Olvidaste tu contraseña?</Link>}
          <div className={styles.divider}><span>o</span></div>
          <button type="button" className={styles.googleButton} onClick={loginWithGoogle} disabled={googleLoading || loading} aria-busy={googleLoading}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.18c0-.67-.06-1.17-.19-1.69H12v3.07h5.38a4.6 4.6 0 0 1-2 3.02l-.02.1 2.91 2.25.2.02c1.84-1.7 2.88-4.2 2.88-6.77Z"/><path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.75l-3.07-2.37c-.82.55-1.9.94-3.38.94-2.53 0-4.68-1.7-5.45-4.07l-.1.01-3.03 2.34-.04.1A9.74 9.74 0 0 0 12 21.7Z"/><path fill="#FBBC05" d="M6.55 13.45A5.86 5.86 0 0 1 6.23 12c0-.5.09-.98.31-1.45v-.1L3.48 8.08l-.1.05A9.67 9.67 0 0 0 2.3 12c0 1.4.39 2.72 1.08 3.87l3.17-2.42Z"/><path fill="#EA4335" d="M12 6.48c1.83 0 3.06.79 3.76 1.44l2.76-2.7C16.83 3.65 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.62 5.83l3.16 2.42C7.32 8.18 9.47 6.48 12 6.48Z"/></svg>{googleLoading ? "Abriendo Google..." : registering ? "Continuar con Google" : "Entrar con Google"}</button>
          <button type="button" className={styles.back} onClick={()=>{setMode(registering ? "login" : "register");setError("");setMessage("");}}>{registering ? "Ya tengo cuenta" : "¿No tienes cuenta? Regístrate"}</button>
        </form>
      </div></div></section>
    </main>
  );
}
