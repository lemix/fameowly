export interface ModelOption {
  id: string;
  name: string;
  provider: "google" | "openrouter";
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // Google Gemini (current stable IDs as of Feb 2026)
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    provider: "google",
  },
  // OpenRouter models
  {
    id: "openai/gpt-4o",
    name: "GPT-4o (OpenRouter)",
    provider: "openrouter",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini (OpenRouter)",
    provider: "openrouter",
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4 (OpenRouter)",
    provider: "openrouter",
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku (OpenRouter)",
    provider: "openrouter",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B (OpenRouter)",
    provider: "openrouter",
  },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    name: "DeepSeek V3 (OpenRouter)",
    provider: "openrouter",
  },
];

export const IMAGE_MODELS: ModelOption[] = [
  {
    id: "openai/dall-e-3",
    name: "DALL-E 3 (OpenRouter)",
    provider: "openrouter",
  },
];
