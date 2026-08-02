import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith("https://"));

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl : "https://invalid.supabase.co",
  hasSupabaseConfig ? supabaseKey : "invalid-key",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

export function getSupabaseConfigStatus() {
  return { hasUrl: Boolean(supabaseUrl), hasKey: Boolean(supabaseKey), configured: hasSupabaseConfig };
}

export type AppRole = "admin" | "usuario";

export async function getCurrentRole(): Promise<AppRole> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("No hay una sesión activa.");
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if (error) throw error;
  return data.role === "admin" ? "admin" : "usuario";
}

export async function getCurrentProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle();
  if (error) throw error;
  const metadata = userData.user.user_metadata ?? {};
  return {
    ...profile,
    id: userData.user.id,
    email: profile?.email ?? userData.user.email ?? "",
    full_name: profile?.full_name ?? metadata.full_name ?? metadata.name ?? "Usuario",
    avatar_url: profile?.avatar_url ?? metadata.avatar_url ?? metadata.picture ?? "",
    role: profile?.role === "admin" ? "admin" : "usuario",
  };
}
