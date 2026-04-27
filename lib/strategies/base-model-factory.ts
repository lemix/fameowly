/**
 * Strategy: base model factory — creates AI SDK provider instances.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createOpenAI } from "@ai-sdk/openai";
import { proxyFetch } from "../proxy-fetch";
import { buildVertexProviderOptions } from "../providers/vertex-auth";
import type { ModelFactory } from "../contracts";
import type { ResolvedCredentials } from "../types";

export class BaseModelFactory implements ModelFactory {
  create(
    credentials: ResolvedCredentials,
    modelId: string,
  ): unknown | null {
    switch (credentials.baseProvider) {
      case "google": {
        const google = createGoogleGenerativeAI({
          apiKey: credentials.apiKey,
          fetch: proxyFetch,
        });
        return google(modelId);
      }
      case "google-vertex": {
        const opts = buildVertexProviderOptions({
          project: credentials.project,
          location: credentials.location,
          credentialsJson: credentials.credentialsJson,
        });
        if (!opts) return null;
        const vertex = createVertex({
          ...opts,
          fetch: proxyFetch,
        });
        return vertex(modelId);
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
        return null;
    }
  }
}
