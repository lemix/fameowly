// ─── Types ───────────────────────────────────────────────────────────

export interface ModelOption {
  id: string;
  name: string;
  provider: "google" | "openrouter";
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
    id: "deepseek/deepseek-chat-v3-0324",
    name: "DeepSeek V3",
    provider: "openrouter",
  },
  { id: "openai/gpt-4.1", name: "GPT-4.1", provider: "openrouter" },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openrouter" },
];

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
