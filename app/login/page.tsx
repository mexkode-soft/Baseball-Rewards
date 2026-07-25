"use client";

import Link from "next/link";

import {
  ArrowLeft,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import LoginBaseballScene from "@/components/LoginBaseballScene";

import {
  hasSupabaseConfig,
  supabase,
} from "@/lib/supabase";

import styles from "./Login.module.css";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    if (!hasSupabaseConfig) {
      const role =
        email
          .toLowerCase()
          .includes("admin")
          ? "admin"
          : "usuario";

      localStorage.setItem(
        "hrr-demo-role",
        role
      );

      router.push("/admin");
      return;
    }

    const {
      error: loginError,
    } =
      await supabase.auth
        .signInWithPassword({
          email: email.trim(),
          password,
        });

    if (loginError) {
      setError(
        "El correo o la contraseña son incorrectos."
      );

      setLoading(false);
      return;
    }

    router.push("/admin");
  }

  return (
    <main className={styles.loginPage}>
      {/* Sección visual con pelota */}
      <section className={styles.loginVisual}>
        <div className={styles.visualInner}>
          <LoginBaseballScene />

          <span className={styles.visualEyebrow}>
            Panel administrativo
          </span>

          <h2 className={styles.visualTitle}>
            Home Run Rewards
            <span>
              {" "}
              Home Run Rewards
            </span>
          </h2>
    
          <p className={styles.visualDescription}>
            Una plataforma para verdaderos fanaticos del baseball
          </p>

          <div className={styles.visualFeature}>
            <div className={styles.featureIcon}>
              <ShieldCheck />
            </div>

            <div>
              <strong>
                Acceso exclusivo
              </strong>

              <p>
                Disponible únicamente para
                personal autorizado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección del formulario */}
      <section className={styles.loginFormSection}>
        <div className={styles.formContainer}>
          <img
            src="/images/logo-home-run.png"
            alt="Home Run Rewards"
            className={styles.formLogo}
          />

          <div className={styles.loginCard}>
            <div className={styles.topActions}>
              <Link
                href="/"
                className={styles.back}
              >
                <ArrowLeft />

                <span>
                  Regresar al inicio
                </span>
              </Link>

              <span className={styles.badge}>
                Acceso administrativo
              </span>
            </div>

            <h1 className={styles.title}>
              Iniciar sesión
            </h1>

            <p className={styles.subtitle}>
              Ingresa tus credenciales para
              acceder al panel.
            </p>

            <form
              className={styles.form}
              onSubmit={submit}
            >
              <label className={styles.label}>
                Correo electrónico

                <div className={styles.inputWrap}>
                  <Mail />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className={styles.label}>
                Contraseña

                <div className={styles.inputWrap}>
                  <LockKeyhole />

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </label>

              {error && (
                <p className={styles.error}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading
                  ? "Validando..."
                  : "Entrar al panel"}
              </button>

              {!hasSupabaseConfig && (
                <small className={styles.demoText}>
                  Demo: usa un correo que
                  contenga “admin” para ver
                  el menú de administrador.
                  Con cualquier otro correo
                  entrarás como usuario.
                </small>
              )}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}