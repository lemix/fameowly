// ─── Types ───────────────────────────────────────────────────────────

export type ModelTier = "basic" | "advanced" | "ultra";

export interface ModelOption {
  id: string;
  name: string;
  provider: "google" | "openrouter" | "local";
  tier: ModelTier;
  isLocal: boolean;
  clientPrice: number;
}

export interface ModelsConfig {
  chatModels: ModelOption[];
  imageModels: ModelOption[];
}

// ─── Default models (fallback if JSON not found) ─────────────────────

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: "gemini-flash-lite-latest", name: "Gemini Flash Lite", provider: "google", tier: "basic", isLocal: false, clientPrice: 1 },
  { id: "gemini-flash-latest", name: "Gemini Flash", provider: "google", tier: "advanced", isLocal: false, clientPrice: 3 },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "openrouter", tier: "advanced", isLocal: false, clientPrice: 3 },
  { id: "gemini-3.1-pro-preview", name: "Gemini Pro", provider: "google", tier: "ultra", isLocal: false, clientPrice: 5 },
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
  openrouter: "bg-orange-400",
  local: "bg-emerald-400",
};

export const IMAGE_MODELS: ModelOption[] = [
  { id: "gemini-3.1-flash-image-preview", name: "Nano Banana 2", provider: "google", tier: "advanced", isLocal: false, clientPrice: 2 },
  { id: "gemini-3-pro-image-preview", name: "Nano Banana Pro", provider: "google", tier: "ultra", isLocal: false, clientPrice: 5 },
  { id: "gemini-2.5-flash-image", name: "Nano Banana", provider: "google", tier: "basic", isLocal: false, clientPrice: 1 },
];

/** Find the default model (first basic local, or first basic, or first) */
export function getDefaultModel(models: ModelOption[]): ModelOption {
  return (
    models.find((m) => m.isLocal && m.tier === "basic") ||
    models.find((m) => m.tier === "basic") ||
    models[0]
  );
}
