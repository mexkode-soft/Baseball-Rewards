"use client";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  createSupabaseBrowserClient,
  hasSupabaseConfig,
} from "@/lib/supabase";

import styles from "./AdminGuard.module.css";

type AppRole =
  | "admin"
  | "usuario";

interface AdminGuardProps {
  children: ReactNode;
  requiredRole: AppRole;
}

export default function AdminGuard({
  children,
  requiredRole,
}: AdminGuardProps) {
  const router = useRouter();

  const [
    authorized,
    setAuthorized,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState(
    "Validando acceso..."
  );

  useEffect(() => {
    let mounted = true;

    if (!hasSupabaseConfig) {
      setMessage(
        "Supabase no está configurado."
      );

      window.location.replace(
        "/login"
      );

      return;
    }

    const supabase =
      createSupabaseBrowserClient();

    async function wait(
      milliseconds: number
    ) {
      await new Promise<void>(
        (resolve) => {
          window.setTimeout(
            resolve,
            milliseconds
          );
        }
      );
    }

    async function validateAccess() {
      try {
        /*
         * Primero espera a que Supabase restaure
         * la sesión guardada por Google.
         */
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
         * Al recargar una ruta protegida,
         * la sesión puede tardar unos
         * milisegundos en hidratarse.
         */
        if (!session) {
          await wait(800);

          const result =
            await supabase.auth
              .getSession();

          session =
            result.data.session;

          if (result.error) {
            throw result.error;
          }
        }

        if (
          !session?.user
        ) {
          if (!mounted) {
            return;
          }

          setMessage(
            "No existe una sesión activa."
          );

          window.location.replace(
            "/login"
          );

          return;
        }

        const user =
          session.user;

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
          console.error(
            "Error consultando el perfil:",
            profileError.message,
            profileError.code,
            profileError.details
          );
        }

        /*
         * Todo usuario autenticado entra
         * como usuario cuando todavía no
         * existe un rol explícito.
         */
        const userRole:
          AppRole =
          profile?.role ===
          "admin"
            ? "admin"
            : "usuario";

        if (
          userRole !==
          requiredRole
        ) {
          const correctRoute =
            userRole ===
            "admin"
              ? "/admin"
              : "/usuario";

          window.location.replace(
            correctRoute
          );

          return;
        }

        if (!mounted) {
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error(
          "Error validando acceso:",
          error
        );

        if (!mounted) {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "No fue posible validar la sesión."
        );
      }
    }

    void validateAccess();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            event,
            session
          ) => {
            if (
              event ===
                "SIGNED_OUT" ||
              !session
            ) {
              window.location.replace(
                "/login"
              );
            }
          }
        );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, [
    requiredRole,
    router,
  ]);

  if (!authorized) {
    return (
      <main
        className={
          styles.loading
        }
      >
        <div
          className={
            styles.spinner
          }
        />

        <p>
          {message}
        </p>
      </main>
    );
  }

  return children;
}