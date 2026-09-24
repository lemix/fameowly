/**
 * Strategy: base model factory — creates AI SDK provider instances.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { extractReasoningMiddleware, defaultSettingsMiddleware, wrapLanguageModel } from "ai";
import { proxyFetch } from "../proxy-fetch";
import { buildVertexProviderOptions } from "../providers/vertex-auth";
import { getLocalLLMBaseURL } from "../local-llm-config";
import type { ModelFactory } from "../contracts";
import type { ResolvedCredentials } from "../types";

/** llama.cpp has no output cap of its own — keep runaway generations bounded. */
const LOCAL_MAX_OUTPUT_TOKENS = 16384;

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
        // openai-compatible (not @ai-sdk/openai): only it maps `reasoning_content`
        // into reasoning parts and passes free-form body fields through providerOptions.
        const openrouter = createOpenAICompatible({
          name: "openrouter",
          apiKey: credentials.apiKey,
          baseURL: credentials.baseURL ?? "https://openrouter.ai/api/v1",
          fetch: proxyFetch,
          includeUsage: true,
        });
        return openrouter.chatModel(modelId);
      }
      case "local": {
        // No proxyFetch: local endpoints live on the LAN, a SOCKS proxy would not reach them.
        // "local" is also the providerOptions key: createOpenAICompatible derives it from `name`.
        const local = createOpenAICompatible({
          name: "local",
          baseURL: credentials.baseURL ?? getLocalLLMBaseURL(modelId),
          includeUsage: true,
        });
        return wrapLanguageModel({
          model: local.chatModel(modelId),
          middleware: [
            // llama.cpp reports reasoning inline unless the server separates it itself.
            extractReasoningMiddleware({ tagName: "think" }),
            defaultSettingsMiddleware({
              settings: { maxOutputTokens: LOCAL_MAX_OUTPUT_TOKENS },
            }),
          ],
        });
      }
    }
  }
}

