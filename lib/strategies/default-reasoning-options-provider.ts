/**
 * Strategy: reasoning options for the OSS providers.
 *
 * Measured behaviour (2026-09-23, live fleet):
 *  - Google returns thought summaries only with `includeThoughts`; without it the
 *    thinking tokens are still generated and billed, just never shown.
 *  - `thinkingBudget: 0` genuinely stops thinking (~2.7x faster, ~4.8x fewer output tokens).
 *  - OpenRouter: `reasoning.enabled: false` zeroes reasoning tokens and keeps the answer
 *    intact; `effort: "low"` only shrinks it, and `exclude: true` returns an empty answer.
 *  - llama.cpp ignores `chat_template_kwargs` unless the server runs with `--jinja`;
 *    the option is wired anyway so it starts working the day that flag appears.
 */

import type { ReasoningOptionsProvider, ReasoningOptionsRequest } from "../contracts";

export class DefaultReasoningOptionsProvider implements ReasoningOptionsProvider {
  resolve(request: ReasoningOptionsRequest): Record<string, unknown> | undefined {
    const thinkingOff = request.reasoningEnabled === false;

    switch (request.baseProvider) {
      case "google":
      case "google-vertex":
        // Vertex reads provider options under the "google" key as well.
        return {
          google: {
            thinkingConfig: thinkingOff ? { thinkingBudget: 0 } : { includeThoughts: true },
          },
        };

      case "openrouter":
        return thinkingOff ? { openrouter: { reasoning: { enabled: false } } } : undefined;

      case "local":
        return thinkingOff
          ? { local: { chat_template_kwargs: { enable_thinking: false } } }
          : undefined;
    }
  }
}
