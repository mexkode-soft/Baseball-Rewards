"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  createSupabaseBrowserClient,
  hasSupabaseConfig,
} from "@/lib/supabase";

type ProfileRole =
  | "admin"
  | "usuario";

export default function AuthCallbackPage() {
  const [message, setMessage] =
    useState(
      "Validando tu cuenta..."
    );

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      if (
        !hasSupabaseConfig
      ) {
        setMessage(
          "Supabase no está configurado."
        );

        window.setTimeout(
          () => {
            window.location.href =
              "/login";
          },
          1800
        );

        return;
      }

      const supabase =
        createSupabaseBrowserClient();

      try {
        /*
         * Espera a que Supabase procese el
         * access_token incluido en la URL.
         */
        await new Promise<void>(
          (resolve) => {
            window.setTimeout(
              resolve,
              600
            );
          }
        );

        let {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase.auth
            .getSession();

        if (sessionError) {
          throw sessionError;
        }

        /*
         * Si todavía no aparece la sesión,
         * esperamos el evento de autenticación.
         */
        if (!session) {
          session =
            await new Promise(
              (resolve) => {
                let subscription:
                  | ReturnType<
                      typeof supabase.auth.onAuthStateChange
                    >["data"]["subscription"]
                  | null = null;

                const timeout =
                  window.setTimeout(
                    () => {
                      subscription
                        ?.unsubscribe();

                      resolve(null);
                    },
                    5000
                  );

                const result =
                  supabase.auth
                    .onAuthStateChange(
                      (
                        event,
                        nextSession
                      ) => {
                        if (
                          event ===
                            "SIGNED_IN" ||
                          event ===
                            "INITIAL_SESSION"
                        ) {
                          window.clearTimeout(
                            timeout
                          );

                          subscription
                            ?.unsubscribe();

                          resolve(
                            nextSession
                          );
                        }
                      }
                    );

                subscription =
                  result.data
                    .subscription;
              }
            );
        }

        if (
          !session?.user
        ) {
          throw new Error(
            "No se pudo recuperar la sesión de Google."
          );
        }

        const user =
          session.user;

        /*
         * Confirmamos que la sesión quedó
         * guardada antes de cambiar de página.
         */
        const {
          data: {
            session:
              persistedSession,
          },
          error:
            persistedError,
        } =
          await supabase.auth
            .getSession();

        if (
          persistedError ||
          !persistedSession
        ) {
          throw (
            persistedError ??
            new Error(
              "La sesión no pudo guardarse correctamente."
            )
          );
        }

        let role:
          ProfileRole =
          "usuario";

        const {
          data: profile,
          error:
            profileError,
        } =
          await supabase
            .from("profiles")
            .select("role")
            .eq(
              "id",
              user.id
            )
            .maybeSingle();

        if (profileError) {
          console.warn(
            "No se pudo consultar el perfil:",
            profileError.message
          );
        }

        if (
          profile?.role ===
          "admin"
        ) {
          role = "admin";
        }

        const destination =
          role === "admin"
            ? "/admin"
            : "/usuario";

        if (cancelled) {
          return;
        }

        setMessage(
          "Acceso correcto. Redirigiendo..."
        );

        /*
         * Redirección completa e inmediata.
         * No usamos router, replaceState
         * ni otro temporizador.
         */
        window.location.href =
          destination;
      } catch (error) {
        console.error(
          "Error del callback:",
          error
        );

        if (cancelled) {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "No fue posible completar el inicio de sesión."
        );

        window.setTimeout(
          () => {
            window.location.href =
              "/login";
          },
          5000
        );
      }
    }

    void completeLogin();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      style={{
        minHeight:
          "100svh",
        display: "grid",
        placeItems:
          "center",
        padding: "24px",
        background:
          "#07080a",
        color: "#ffffff",
        textAlign:
          "center",
      }}
    >
      <section>
        <img
          src="/images/logo-home-run.png"
          alt="Home Run Rewards"
          style={{
            width:
              "min(280px, 72vw)",
            height: "auto",
            objectFit:
              "contain",
            marginBottom:
              "24px",
          }}
        />

        <p>
          {message}
        </p>
      </section>
    </main>
  );
}