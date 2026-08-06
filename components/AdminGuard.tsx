"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  createSupabaseBrowserClient,
  hasSupabaseConfig,
} from "@/lib/supabase";
import {
  obtenerRolActual,
  obtenerRutaInicialPorRol,
  type RolAplicacion,
} from "@/lib/roles";
import styles from "./AdminGuard.module.css";

type RolProtegido = Exclude<RolAplicacion, "sponsor">;

export default function AdminGuard({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole: RolProtegido;
}) {
  const [autorizado, setAutorizado] = useState(false);
  const [mensaje, setMensaje] = useState("Validando acceso...");

  useEffect(() => {
    let montado = true;

    if (!hasSupabaseConfig) {
      window.location.replace("/login");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    async function validarAcceso() {
      try {
        let {
          data: { session: sesion },
          error: errorSesion,
        } = await supabase.auth.getSession();

        if (errorSesion) throw errorSesion;

        if (!sesion) {
          await new Promise((resolver) => window.setTimeout(resolver, 700));
          const resultado = await supabase.auth.getSession();
          sesion = resultado.data.session;
          if (resultado.error) throw resultado.error;
        }

        if (!sesion?.user) {
          window.location.replace("/login");
          return;
        }

        const rol = await obtenerRolActual(supabase);

        if (rol !== requiredRole) {
          window.location.replace(obtenerRutaInicialPorRol(rol));
          return;
        }

        if (montado) setAutorizado(true);
      } catch (error) {
        console.error("No fue posible validar el rol:", error);
        if (montado) {
          setMensaje(
            error instanceof Error
              ? error.message
              : "No fue posible validar la sesión.",
          );
        }
      }
    }

    void validarAcceso();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === "SIGNED_OUT" || !sesion) {
        window.location.replace("/login");
      }
    });

    return () => {
      montado = false;
      subscription.unsubscribe();
    };
  }, [requiredRole]);

  if (!autorizado) {
    return (
      <main className={styles.loading}>
        <div className={styles.spinner} />
        <p>{mensaje}</p>
      </main>
    );
  }

  return children;
}
