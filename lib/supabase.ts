import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL
    ?.trim() ?? "";

const supabaseKey =
  (
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  ).trim();

export const hasSupabaseConfig =
  Boolean(
    supabaseUrl &&
      supabaseKey &&
      supabaseUrl.startsWith(
        "https://"
      )
  );

export function getSupabaseConfigStatus() {
  return {
    hasUrl:
      Boolean(
        supabaseUrl
      ),
    hasKey:
      Boolean(
        supabaseKey
      ),
    configured:
      hasSupabaseConfig,
  };
}

/*
 * Se usa un cliente siempre definido para evitar
 * errores de TypeScript como:
 * "supabase is possibly null".
 *
 * Cuando faltan variables, se crea con valores
 * de respaldo. La aplicación debe revisar
 * hasSupabaseConfig antes de autenticar o consultar.
 */
let browserClient:
  SupabaseClient | null =
  null;

export function createSupabaseBrowserClient():
  SupabaseClient {
  if (
    browserClient
  ) {
    return browserClient;
  }

  browserClient =
    createClient(
      hasSupabaseConfig
        ? supabaseUrl
        : "https://placeholder.supabase.co",
      hasSupabaseConfig
        ? supabaseKey
        : "placeholder-public-key",
      {
        auth: {
          persistSession:
            true,
          autoRefreshToken:
            true,
          detectSessionInUrl:
            true,
        },
      }
    );

  return browserClient;
}

export const createSupabaseClient =
  createSupabaseBrowserClient;

/*
 * Compatibilidad con todos los componentes
 * que importan directamente { supabase }.
 * Su tipo nunca es null.
 */
export const supabase:
  SupabaseClient =
  createSupabaseBrowserClient();

export type AppRole =
  | "admin"
  | "usuario";

export interface CurrentProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: AppRole;
  phone?: string | null;
  state?: string | null;
  municipality?: string | null;
  favorite_team?: string | null;
  points?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function getCurrentRole():
  Promise<AppRole> {
  if (
    !hasSupabaseConfig
  ) {
    throw new Error(
      "Supabase no está configurado."
    );
  }

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    throw new Error(
      "No hay una sesión activa."
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("profiles")
      .select("role")
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.role ===
    "admin"
    ? "admin"
    : "usuario";
}

export async function getCurrentProfile():
  Promise<CurrentProfile | null> {
  if (
    !hasSupabaseConfig
  ) {
    return null;
  }

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    return null;
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
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
  }

  const metadata =
    user.user_metadata ??
    {};

  return {
    ...(profile ?? {}),
    id: user.id,
    email:
      profile?.email ??
      user.email ??
      "",
    full_name:
      profile?.full_name ??
      metadata.full_name ??
      metadata.name ??
      user.email
        ?.split("@")[0] ??
      "Usuario",
    avatar_url:
      profile?.avatar_url ??
      metadata.avatar_url ??
      metadata.picture ??
      "",
    role:
      profile?.role ===
      "admin"
        ? "admin"
        : "usuario",
  } as CurrentProfile;
}
