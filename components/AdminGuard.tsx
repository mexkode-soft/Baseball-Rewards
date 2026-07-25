"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  hasSupabaseConfig,
  supabase,
} from "@/lib/supabase";

import styles from "./AdminGuard.module.css";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({
  children,
}: AdminGuardProps) {
  const router = useRouter();

  const [authorized, setAuthorized] =
    useState(!hasSupabaseConfig);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (
          error ||
          !data.user
        ) {
          router.replace("/login");
          return;
        }

        setAuthorized(true);
      });

    const {
      data: authenticationListener,
    } =
      supabase.auth.onAuthStateChange(
        (event) => {
          if (
            event === "SIGNED_OUT"
          ) {
            router.replace("/login");
          }
        }
      );

    return () => {
      authenticationListener
        .subscription
        .unsubscribe();
    };
  }, [router]);

  if (!authorized) {
    return (
      <main className={styles.loading}>
        <div className={styles.spinner} />

        <p>
          Validando acceso...
        </p>
      </main>
    );
  }

  return children;
}