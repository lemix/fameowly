/**
 * Contract: web tools (live search, URL reading).
 *
 * Two mechanisms, because providers differ fundamentally:
 *  - `resolve()` — provider-native tools passed to `streamText()` (Google);
 *  - `prepareContext()` — pre-fetched text injected into the prompt, for models
 *    that cannot call tools themselves (llama.cpp without `--jinja`, most others).
 */

import type { BaseProvider } from "../types";
import type { MessageGrounding } from "../web-tools/grounding";

export interface WebToolsRequest {
  baseProvider: BaseProvider;
  /** User enabled live web search for this chat */
  webSearchEnabled: boolean;
  /** The current user message contains at least one fetchable public URL */
  urlContextRequested: boolean;
}

export interface WebContextRequest extends WebToolsRequest {
  modelId: string;
  /** Text of the current user message only — never the history */
  userMessage: string;
  /** Public URLs found in `userMessage`, already filtered by the SSRF host gate */
  urls: string[];
  abortSignal: AbortSignal;
}

export interface WebContextResult {
  /** Appended to the system prompt: how to treat the injected content */
  systemNote: string;
  /** Untrusted web content, prepended to the current user message */
  contextText: string;
  /** Provenance for the UI; never sent back to the LLM */
  grounding?: MessageGrounding;
}

export interface WebToolsProvider {
  /**
   * Build the `tools` object passed to `streamText()`.
   * @returns undefined when no web tool applies — the caller then omits `tools` entirely.
   */
  resolve(request: WebToolsRequest): Record<string, unknown> | undefined;

  /**
   * Fetch web content up front and hand it back as prompt text.
   * Optional: providers served by native tools do not implement it.
   * Must not throw on network failures — return undefined instead.
   */
  prepareContext?(request: WebContextRequest): Promise<WebContextResult | undefined>;
}
