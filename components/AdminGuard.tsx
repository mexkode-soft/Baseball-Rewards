"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import styles from "./AdminGuard.module.css";

type RequiredRole = "admin" | "usuario";

interface AdminGuardProps {
  children: React.ReactNode;
  requiredRole?: RequiredRole;
}

export default function AdminGuard({
  children,
  requiredRole,
}: AdminGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    function authorizeRole(role: string | undefined) {
      const normalizedRole = role === "admin" ? "admin" : "usuario";

      if (requiredRole && normalizedRole !== requiredRole) {
        router.replace(
          normalizedRole === "admin"
            ? "/admin/crear-campana"
            : "/usuario/perfil"
        );
        return;
      }

      if (active) {
        setAuthorized(true);
      }
    }

    if (!hasSupabaseConfig) {
      const demoRole = localStorage.getItem("hrr-demo-role");

      if (!demoRole) {
        router.replace("/login");
        return () => { active = false; };
      }

      authorizeRole(demoRole);
      return () => { active = false; };
    }

    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      authorizeRole(data.user.user_metadata?.role);
    });

    const { data: authenticationListener } =
      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          router.replace("/login");
        }
      });

    return () => {
      active = false;
      authenticationListener.subscription.unsubscribe();
    };
  }, [requiredRole, router]);

  if (!authorized) {
    return (
      <main className={styles.loading}>
        <div className={styles.spinner} />
        <p>Validando acceso...</p>
      </main>
    );
  }

  return children;
}
