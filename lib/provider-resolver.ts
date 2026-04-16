/**
 * Provider resolver — determines the API key / base URL for a given
 * model + user role. Priority: admin-configured virtual providers → .env fallback.
 */

import { readModelsConfig } from "./models.server";
import { getCachedProviders, getRotatedKey } from "./provider-store";
import type { BaseProvider, ResolvedCredentials, VirtualProvider } from "./types";
import type { ModelOption } from "./models";

/**
 * Resolve credentials for a model request.
 *
 * 1. Find model config → get virtualProviderId (if set) or baseProvider
 * 2. If virtualProviderId → look up virtual provider, pick keys for role
 * 3. Else → fallback to .env
 */
export function resolveCredentials(
  modelId: string,
  provider: string,
  userRole: string,
): ResolvedCredentials {
  const { chatModels, imageModels } = readModelsConfig();
  const allModels = [...chatModels, ...imageModels];
  const model = allModels.find((m) => m.id === modelId);

  // If model has a virtualProviderId, try admin config
  if (model?.virtualProviderId) {
    const resolved = resolveFromVirtualProvider(model.virtualProviderId, userRole);
    if (resolved) return resolved;
  }

  // Try to find any virtual provider for this base provider + role
  const baseProvider = (model?.provider ?? provider) as BaseProvider;
  const vpResolved = resolveFromBaseProvider(baseProvider, userRole);
  if (vpResolved) return vpResolved;

  // Fallback to .env
  return resolveFromEnv(baseProvider);
}

function resolveFromVirtualProvider(
  vpId: string,
  role: string,
): ResolvedCredentials | null {
  const providers = getCachedProviders();
  const vp = providers.find((p) => p.id === vpId);
  if (!vp) return null;
  return pickKeyFromVP(vp, role);
}

function resolveFromBaseProvider(
  baseProvider: BaseProvider,
  role: string,
): ResolvedCredentials | null {
  const providers = getCachedProviders();
  // Find first VP matching this base provider that has keys for this role
  const candidates = providers.filter((p) => p.baseProvider === baseProvider);
  for (const vp of candidates) {
    const result = pickKeyFromVP(vp, role);
    if (result) return result;
  }
  return null;
}

function pickKeyFromVP(
  vp: VirtualProvider,
  role: string,
): ResolvedCredentials | null {
  // Try exact role match, then "default" fallback
  const group = vp.groups[role] ?? vp.groups["default"];
  if (!group || group.keys.length === 0) return null;

  const key = getRotatedKey(vp.id, role, group.keys, group.rotationThreshold);

  if (vp.baseProvider === "local") {
    // For local providers, keys are base URLs
    return { baseProvider: "local", apiKey: "", baseURL: key };
  }

  return { baseProvider: vp.baseProvider, apiKey: key };
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
