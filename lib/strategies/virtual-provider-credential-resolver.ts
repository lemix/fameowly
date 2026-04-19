/**
 * Strategy: resolve credentials via virtual providers with key rotation.
 * Falls back to .env when no virtual provider is assigned.
 *
 * Resolution order:
 * 1. Model has virtualProviderId → use that VP's keys with rotation
 * 2. Local models without VP → LOCAL_LLM_HOSTS → LOCAL_LLM_URL → default
 * 3. Non-local models without VP → .env variables
 *
 * ONLY a virtual provider assignment overrides .env settings.
 */

import type { ProviderResolver } from "../contracts";
import type { BaseProvider, ResolvedCredentials, VirtualProvider } from "../types";
import { readModelsConfig } from "../models.server";
import { getLocalLLMBaseURL } from "../local-llm-config";
import { getCachedProviders, getRotatedKey } from "../provider-store";

export class VirtualProviderCredentialResolver implements ProviderResolver {
  resolve(
    modelId: string,
    provider: string,
    userRole: string,
  ): ResolvedCredentials | null {
    const { chatModels, imageModels } = readModelsConfig();
    const allModels = [...chatModels, ...imageModels];
    const model = allModels.find((m) => m.id === modelId);
    const baseProvider = (model?.provider ?? provider) as BaseProvider;

    // Only if model has explicit virtualProviderId → use VP with rotation
    if (model?.virtualProviderId) {
      const resolved = this.resolveFromVP(model.virtualProviderId, userRole);
      if (resolved) return resolved;
    }

    // No VP assigned → .env fallback
    if (baseProvider === "local") {
      return {
        baseProvider: "local",
        apiKey: "",
        baseURL: model?.baseURL || getLocalLLMBaseURL(modelId),
      };
    }

    return this.resolveFromEnv(baseProvider);
  }

  private resolveFromVP(
    vpId: string,
    role: string,
  ): ResolvedCredentials | null {
    const providers = getCachedProviders();
    const vp = providers.find((p) => p.id === vpId);
    if (!vp) return null;
    return this.pickKeyFromVP(vp, role);
  }

  private pickKeyFromVP(
    vp: VirtualProvider,
    role: string,
  ): ResolvedCredentials | null {
    const group = vp.groups[role] ?? vp.groups["default"];
    if (!group || group.keys.length === 0) return null;

    const key = getRotatedKey(vp.id, role, group.keys, group.rotationThreshold);

    if (vp.baseProvider === "local") {
      return { baseProvider: "local", apiKey: "", baseURL: key };
    }

    return { baseProvider: vp.baseProvider, apiKey: key };
  }

  private resolveFromEnv(baseProvider: BaseProvider): ResolvedCredentials {
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
}
