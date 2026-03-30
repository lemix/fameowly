// ─── Types ───────────────────────────────────────────────────────────

export interface ModelOption {
  id: string;
  name: string;
  provider: "google" | "openrouter" | "local";
}

export interface ModelsConfig {
  chatModels: ModelOption[];
  imageModels: ModelOption[];
}

// ─── Default models (fallback if JSON not found) ─────────────────────

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", provider: "google" },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "google" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google" },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "openrouter",
  },
  { id: "openai/gpt-5.4-mini", name: "GPT-5.4 Mini", provider: "openrouter" },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6", provider: "openrouter" },
  {
    id: "qwen3.5-122b-a10b",
    name: "Qwen 3.5 122B",
    provider: "local",
  },
];

// ─── Provider display info ───────────────────────────────────────────

export const PROVIDER_LABELS: Record<ModelOption["provider"], string> = {
  google: "Google",
  openrouter: "OpenRouter",
  local: "Free",
};

export const PROVIDER_ORDER: ModelOption["provider"][] = [
  "google",
  "openrouter",
  "local",
];

export const PROVIDER_COLORS: Record<ModelOption["provider"], string> = {
  google: "bg-green-400",
  openrouter: "bg-orange-400",
  local: "bg-sky-400",
};

export const IMAGE_MODELS: ModelOption[] = [
  {
    id: "gemini-3.1-flash-image-preview",
    name: "Nano Banana 2",
    provider: "google",
  },
  {
    id: "gemini-3-pro-image-preview",
    name: "Nano Banana Pro",
    provider: "google",
  },
  { id: "gemini-2.5-flash-image", name: "Nano Banana", provider: "google" },
];
