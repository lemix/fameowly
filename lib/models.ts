// ─── Types ───────────────────────────────────────────────────────────

export type ModelTier = "basic" | "advanced" | "ultra";

export interface ModelOption {
  id: string;
  name: string;
  provider: "google" | "google-vertex" | "openrouter" | "local";
  tier: ModelTier;
  /** Defaults to `true` when provider is "local", `false` otherwise */
  isLocal?: boolean;
  /**
   * Rate plan ids allowed to use this model. Undefined means "any plan";
   * an empty array means "admins only". Applied by a plugin, not by core.
   */
  availableFor?: string[];
  /** Provider price in USD per 1M input (prompt) tokens. Undefined = free */
  inputPricePer1M?: number;
  /** Provider price in USD per 1M output (completion) tokens. Undefined = free */
  outputPricePer1M?: number;
  /** Provider price in USD per generated image. Undefined = free */
  pricePerImage?: number;
  /** @deprecated migrated into `inputPricePer1M` / `outputPricePer1M` on read */
  pricePer1MTokens?: number;
  /** Defaults to `false` */
  supportsReasoning?: boolean;
  /** Defaults to `false` */
  supportsTemperature?: boolean;
  description?: string;
  /** OpenAI-compatible base URL for local models (e.g. http://host:port/v1) */
  baseURL?: string;
  /** Links this model to a virtual provider (from admin panel) */
  virtualProviderId?: string;
}

export interface ModelsConfig {
  chatModels: ModelOption[];
  imageModels: ModelOption[];
}

// ─── Default models (fallback if JSON not found) ─────────────────────

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: "gemini-flash-lite-latest", name: "Gemini Flash Lite", provider: "google", tier: "basic", isLocal: false },
  { id: "gemini-flash-latest", name: "Gemini Flash", provider: "google", tier: "advanced", isLocal: false },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "openrouter", tier: "advanced", isLocal: false },
  { id: "gemini-3.1-pro-preview", name: "Gemini Pro", provider: "google", tier: "ultra", isLocal: false },
];

// ─── Tier display info ───────────────────────────────────────────────

export const TIER_LABELS: Record<ModelTier, string> = {
  basic: "Базовые",
  advanced: "Продвинутые",
  ultra: "Ультра",
};

export const TIER_ORDER: ModelTier[] = ["basic", "advanced", "ultra"];

export const TIER_ICONS: Record<ModelTier, string> = {
  basic: "⚡",
  advanced: "🚀",
  ultra: "👑",
};

// ─── Provider display info ───────────────────────────────────────────

export const PROVIDER_COLORS: Record<ModelOption["provider"], string> = {
  google: "bg-green-400",
  "google-vertex": "bg-sky-400",
  openrouter: "bg-orange-400",
  local: "bg-emerald-400",
};

export const IMAGE_MODELS: ModelOption[] = [
  { id: "gemini-3.1-flash-image-preview", name: "Nano Banana 2", provider: "google", tier: "advanced", isLocal: false },
  { id: "gemini-3-pro-image-preview", name: "Nano Banana Pro", provider: "google", tier: "ultra", isLocal: false },
  { id: "gemini-2.5-flash-image", name: "Nano Banana", provider: "google", tier: "basic", isLocal: false },
];

/** Find the default model: first basic, then advanced, then ultra, then first */
export function getDefaultModel(models: ModelOption[]): ModelOption {
  return (
    models.find((m) => m.tier === "basic") ||
    models.find((m) => m.tier === "advanced") ||
    models.find((m) => m.tier === "ultra") ||
    models[0]
  );
}
