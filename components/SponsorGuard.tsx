"use client";
import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SponsorGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Validando acceso de patrocinador...");
  useEffect(() => {
    let active = true;
    async function validate() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { window.location.replace("/login"); return; }
      const { data, error } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (error) { setMessage(error.message); return; }
      if (data?.role !== "sponsor") {
        window.location.replace(data?.role === "admin" ? "/admin" : "/usuario");
        return;
      }
      if (active) setReady(true);
    }
    void validate();
    return () => { active = false; };
  }, []);
  if (!ready) return <main style={{minHeight:"100svh",display:"grid",placeItems:"center",background:"#07080a",color:"white",padding:24}}><p>{message}</p></main>;
  return children;
}
