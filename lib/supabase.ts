import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export const hasSupabaseConfig =
  Boolean(
    supabaseUrl &&
      supabaseKey
  );

let browserClient:
  SupabaseClient | null =
  null;

export function createSupabaseBrowserClient():
  SupabaseClient {
  if (!hasSupabaseConfig) {
    throw new Error(
      "Faltan las variables de Supabase en .env.local."
    );
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  return browserClient;
}

export const createSupabaseClient =
  createSupabaseBrowserClient;

/*
 * Compatibilidad con componentes existentes
 * que importan directamente { supabase }.
 */
export const supabase:
  SupabaseClient | null =
  hasSupabaseConfig
    ? createSupabaseBrowserClient()
    : null;

    export interface CurrentProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "usuario";
  phone?: string | null;
  state?: string | null;
  municipality?: string | null;
  favorite_team?: string | null;
}

export async function getCurrentProfile():
  Promise<CurrentProfile | null> {
  if (!hasSupabaseConfig) {
    return null;
  }

  const client =
    createSupabaseBrowserClient();

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await client.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    console.warn(
      "No se encontró un usuario autenticado:",
      userError?.message
    );

    return null;
  }

  const {
    data: profile,
    error: profileError,
  } =
    await client
      .from("profiles")
      .select("*")
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (profileError) {
    console.error(
      "No fue posible obtener el perfil:",
      profileError.message,
      profileError.code
    );

    return null;
  }

  if (!profile) {
    return {
      id: user.id,
      email:
        user.email ??
        null,
      full_name:
        user.user_metadata
          ?.full_name ??
        user.user_metadata
          ?.name ??
        user.email
          ?.split("@")[0] ??
        "Usuario",
      avatar_url:
        user.user_metadata
          ?.avatar_url ??
        user.user_metadata
          ?.picture ??
        null,
      role: "usuario",
    };
  }

  return profile as CurrentProfile;
}