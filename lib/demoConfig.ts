import { supabase } from "@/lib/supabase";

export interface DemoConfig {
  enable24HourCooldown: boolean;
  blockAlreadyCollectedRewards: boolean;
  simulatedLocationEnabled: boolean;
  simulatedLatitude: number;
  simulatedLongitude: number;
}

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export const DEFAULT_DEMO_CONFIG: DemoConfig = {
  enable24HourCooldown: true,
  blockAlreadyCollectedRewards: true,
  simulatedLocationEnabled: false,
  simulatedLatitude: 19.432608,
  simulatedLongitude: -99.133209,
};
export const DEMO_CONFIG_EVENT = "hrr-demo-config-updated";

export async function readDemoConfig(): Promise<DemoConfig> {
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", "demo").maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_DEMO_CONFIG, ...((data?.value ?? {}) as Partial<DemoConfig>) };
}

// Para la experiencia de usuario la simulación solo se considera activa cuando
// el usuario autenticado fue elegido explícitamente en Admin > Demo.
export async function readEffectiveDemoConfig(): Promise<DemoConfig> {
  const [config, status] = await Promise.all([
    readDemoConfig(),
    supabase.rpc("get_my_demo_status"),
  ]);
  if (status.error) throw status.error;
  const enabled = Boolean((status.data as { enabled?: boolean } | null)?.enabled);
  // Usuarios no seleccionados conservan las reglas normales de producción.
  // Solo las cuentas demo reciben los overrides configurados por el administrador.
  return enabled ? config : { ...DEFAULT_DEMO_CONFIG, simulatedLocationEnabled: false };
}

export async function saveDemoConfig(config: DemoConfig): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("app_settings").upsert({
    key: "demo",
    value: config,
    updated_by: userData.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  window.dispatchEvent(new CustomEvent(DEMO_CONFIG_EVENT));
}

export async function readDemoDirectory(): Promise<DemoUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("role", "usuario")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    email: String(row.email ?? ""),
    fullName: String(row.full_name ?? "Usuario"),
    role: String(row.role ?? "usuario"),
  }));
}

export async function readDemoUserIds(): Promise<string[]> {
  const { data, error } = await supabase.from("demo_users").select("user_id").eq("enabled", true);
  if (error) throw error;
  return (data ?? []).map((row) => String(row.user_id));
}

export async function saveDemoUserIds(userIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(userIds)).slice(0, 10);
  const { error } = await supabase.rpc("set_demo_users", { p_user_ids: uniqueIds });
  if (error) throw error;
  window.dispatchEvent(new CustomEvent(DEMO_CONFIG_EVENT));
}
