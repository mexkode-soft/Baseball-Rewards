import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith("https://"));
export function getSupabaseConfigStatus() { return { hasUrl: Boolean(supabaseUrl), hasKey: Boolean(supabaseKey), configured: hasSupabaseConfig }; }

let browserClient: SupabaseClient | null = null;
export function createSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;
  browserClient = createClient(
    hasSupabaseConfig ? supabaseUrl : "https://placeholder.supabase.co",
    hasSupabaseConfig ? supabaseKey : "placeholder-public-key",
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  return browserClient;
}
export const createSupabaseClient = createSupabaseBrowserClient;
export const supabase: SupabaseClient = createSupabaseBrowserClient();
export type AppRole = "admin" | "usuario" | "sponsor";
export interface CurrentProfile { id:string; email:string; full_name:string; avatar_url:string; role:AppRole; phone?:string|null; state?:string|null; municipality?:string|null; favorite_team?:string|null; total_points?:number|null; }
export async function getCurrentRole(): Promise<AppRole> {
  if (!hasSupabaseConfig) {
    throw new Error("Supabase no está configurado.");
  }

  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError || !authData.user) {
    throw new Error("No hay una sesión activa.");
  }

  const { data: role, error: roleError } = await supabase.rpc(
    "obtener_rol_actual",
  );

  if (roleError) {
    throw new Error(`No fue posible consultar el rol: ${roleError.message}`);
  }

  if (role === "admin" || role === "sponsor" || role === "usuario") {
    return role;
  }

  throw new Error(
    `El usuario ${authData.user.email ?? authData.user.id} no tiene un rol válido.`,
  );
}
export async function getCurrentProfile(): Promise<CurrentProfile|null> {
  if (!hasSupabaseConfig) return null;
  const { data:{user}, error:userError } = await supabase.auth.getUser();
  if (userError || !user) return null;
  const { data:profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) console.warn("No fue posible obtener el perfil:", error.message);
  const metadata = user.user_metadata ?? {};
  return {
    ...(profile ?? {}), id:user.id,
    email: profile?.email ?? user.email ?? "",
    full_name: profile?.full_name ?? metadata.full_name ?? metadata.name ?? user.email?.split("@")[0] ?? "Usuario",
    avatar_url: profile?.avatar_url ?? metadata.avatar_url ?? metadata.picture ?? "",
    role: profile?.role === "admin" ? "admin" : profile?.role === "sponsor" ? "sponsor" : "usuario",
  } as CurrentProfile;
}
