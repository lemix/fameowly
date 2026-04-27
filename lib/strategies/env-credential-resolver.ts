/**
 * Strategy: resolve credentials from environment variables only.
 * Used when no virtual provider is assigned to a model.
 */

import type { ProviderResolver } from "../contracts";
import type { BaseProvider, ResolvedCredentials } from "../types";
import { readModelsConfig } from "../models.server";
import { getLocalLLMBaseURL } from "../local-llm-config";

export class EnvCredentialResolver implements ProviderResolver {
  resolve(
    modelId: string,
    provider: string,
    _userRole: string,
  ): ResolvedCredentials | null {
    const { chatModels, imageModels } = readModelsConfig();
    const allModels = [...chatModels, ...imageModels];
    const model = allModels.find((m) => m.id === modelId);
    const baseProvider = (model?.provider ?? provider) as BaseProvider;

    if (baseProvider === "local") {
      return {
        baseProvider: "local",
        apiKey: "",
        baseURL: model?.baseURL || getLocalLLMBaseURL(modelId),
      };
    }

    return this.resolveFromEnv(baseProvider);
  }

  private resolveFromEnv(baseProvider: BaseProvider): ResolvedCredentials {
    switch (baseProvider) {
      case "google":
        return {
          baseProvider: "google",
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
        };
      case "google-vertex":
        return {
          baseProvider: "google-vertex",
          apiKey: "",
          project: process.env.GOOGLE_VERTEX_PROJECT,
          location: process.env.GOOGLE_VERTEX_LOCATION,
          credentialsJson: process.env.GOOGLE_VERTEX_CREDENTIALS_JSON,
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
}
