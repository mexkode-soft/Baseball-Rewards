"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentRole, hasSupabaseConfig, supabase } from "@/lib/supabase";
import styles from "./AdminGuard.module.css";

type RequiredRole = "admin" | "usuario";
export default function AdminGuard({ children, requiredRole }: { children: React.ReactNode; requiredRole?: RequiredRole }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  useEffect(() => {
    let active = true;
    async function check() {
      if (!hasSupabaseConfig) { router.replace("/login"); return; }
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) { router.replace("/login"); return; }
      try {
        const role = await getCurrentRole();
        if (requiredRole && role !== requiredRole) { router.replace(role === "admin" ? "/admin" : "/usuario"); return; }
        if (active) setAuthorized(true);
      } catch { router.replace("/login"); }
    }
    void check();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") router.replace("/login"); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [requiredRole, router]);
  if (!authorized) return <main className={styles.loading}><div className={styles.spinner}/><p>Validando acceso...</p></main>;
  return children;
}
