/**
 * Provider factory — creates AI SDK provider instances from resolved credentials.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { proxyFetch } from "@/lib/proxy-fetch";
import type { ResolvedCredentials } from "@/lib/types";

/**
 * Create an AI SDK language model from resolved credentials.
 * For "local" provider, returns null — local uses its own streaming.
 */
export function createProviderModel(
  credentials: ResolvedCredentials,
  modelId: string,
) {
  switch (credentials.baseProvider) {
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: credentials.apiKey,
        fetch: proxyFetch,
      });
      return google(modelId);
    }
    case "openrouter": {
      const openrouter = createOpenAI({
        apiKey: credentials.apiKey,
        baseURL: credentials.baseURL ?? "https://openrouter.ai/api/v1",
        fetch: proxyFetch,
      });
      return openrouter.chat(modelId);
    }
    case "local":
      // Local provider doesn't use AI SDK — handled separately
      return null;
  }
}
