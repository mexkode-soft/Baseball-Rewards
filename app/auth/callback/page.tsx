"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentRole, supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    async function finishLogin() {
      try {
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw userError ?? new Error("No se pudo recuperar la sesión.");

        const user = userData.user;
        const metadata = user.user_metadata ?? {};
        const googleAvatar = metadata.avatar_url ?? metadata.picture ?? null;
        const fullName = metadata.full_name ?? metadata.name ?? null;

        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("avatar_url,full_name")
          .eq("id", user.id)
          .maybeSingle();

        const shouldUseGoogleAvatar = !currentProfile?.avatar_url || !String(currentProfile.avatar_url).startsWith("http");
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          full_name: currentProfile?.full_name || fullName,
          avatar_url: shouldUseGoogleAvatar ? googleAvatar : currentProfile?.avatar_url,
          updated_at: new Date().toISOString(),
        });

        const role = await getCurrentRole();
        router.replace(role === "admin" ? "/admin" : "/usuario");
      } catch (error) {
        console.error(error);
        router.replace("/login?error=oauth");
      }
    }

    void finishLogin();
  }, [params, router]);

  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", background: "#07080b", color: "white" }}>
      <p>Preparando tu cuenta...</p>
    </main>
  );
}
