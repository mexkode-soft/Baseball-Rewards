import { supabase } from "@/lib/supabase";

export interface DemoConfig {
  enable24HourCooldown: boolean;
  blockAlreadyCollectedRewards: boolean;
  simulatedLocationEnabled: boolean;
  simulatedLatitude: number;
  simulatedLongitude: number;
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
