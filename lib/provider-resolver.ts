/**
 * Base provider resolver — resolves API credentials from environment variables.
 * This is the open-source fallback. Premium plugin overrides this with
 * virtual providers, key pools, and rotation logic.
 */

import { readModelsConfig } from "./models.server";
import type { BaseProvider, ResolvedCredentials } from "./types";

/**
 * Resolve credentials for a model request from .env variables.
 */
export function resolveCredentials(
  modelId: string,
  provider: string,
  _userRole: string,
): ResolvedCredentials {
  const { chatModels, imageModels } = readModelsConfig();
  const allModels = [...chatModels, ...imageModels];
  const model = allModels.find((m) => m.id === modelId);
  const baseProvider = (model?.provider ?? provider) as BaseProvider;

  return resolveFromEnv(baseProvider);
}

function resolveFromEnv(baseProvider: BaseProvider): ResolvedCredentials {
  switch (baseProvider) {
    case "google":
      return {
        baseProvider: "google",
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
      };
    case "openrouter":
      return {
        baseProvider: "openrouter",
        apiKey: process.env.OPENROUTER_API_KEY ?? "",
        baseURL: "https://openrouter.ai/api/v1",
      };
    case "local":
      return {
        baseProvider: "local",
        apiKey: "",
        baseURL: process.env.LOCAL_LLM_URL ?? "http://127.0.0.1:8080/v1",
      };
  }
}
