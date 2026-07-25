export interface DemoConfig {
  enable24HourCooldown: boolean;
  blockAlreadyCollectedRewards: boolean;
}

export const DEMO_CONFIG_STORAGE_KEY =
  "hrr-demo-config";

export const DEMO_CONFIG_EVENT =
  "hrr-demo-config-changed";

export const DEFAULT_DEMO_CONFIG: DemoConfig = {
  enable24HourCooldown: true,
  blockAlreadyCollectedRewards: true,
};

export function readDemoConfig(): DemoConfig {
  if (typeof window === "undefined") {
    return DEFAULT_DEMO_CONFIG;
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        DEMO_CONFIG_STORAGE_KEY
      );

    if (!storedValue) {
      return DEFAULT_DEMO_CONFIG;
    }

    const parsedValue =
      JSON.parse(storedValue) as
        Partial<DemoConfig>;

    return {
      enable24HourCooldown:
        typeof parsedValue.enable24HourCooldown ===
        "boolean"
          ? parsedValue.enable24HourCooldown
          : DEFAULT_DEMO_CONFIG.enable24HourCooldown,

      blockAlreadyCollectedRewards:
        typeof parsedValue.blockAlreadyCollectedRewards ===
        "boolean"
          ? parsedValue.blockAlreadyCollectedRewards
          : DEFAULT_DEMO_CONFIG.blockAlreadyCollectedRewards,
    };
  } catch (error) {
    console.warn(
      "No fue posible leer la configuración de demo:",
      error
    );

    return DEFAULT_DEMO_CONFIG;
  }
}

export function saveDemoConfig(
  config: DemoConfig
) {
  window.localStorage.setItem(
    DEMO_CONFIG_STORAGE_KEY,
    JSON.stringify(config)
  );

  window.dispatchEvent(
    new CustomEvent(
      DEMO_CONFIG_EVENT,
      {
        detail: config,
      }
    )
  );
}

export function resetDemoConfig() {
  saveDemoConfig(
    DEFAULT_DEMO_CONFIG
  );
}
