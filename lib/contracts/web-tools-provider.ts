/**
 * Contract: web tools (live search, URL reading).
 *
 * Two mechanisms, because providers differ fundamentally:
 *  - `resolve()` — tools passed to `streamText()`: provider-native (Google) or
 *    function tools the model calls itself (models flagged `supportsToolCalling`);
 *  - `prepareContext()` — pre-fetched text injected into the prompt.
 */

import type { BaseProvider } from "../types";
import type { MessageGrounding } from "../web-tools/grounding";

export interface WebToolsRequest {
  baseProvider: BaseProvider;
  modelId?: string;
  /** User enabled live web search for this chat */
  webSearchEnabled: boolean;
  /** The current user message contains at least one fetchable public URL */
  urlContextRequested: boolean;
  /** Public URLs the user pasted anywhere in this chat, SSRF host gate applied. Never from assistant replies. */
  chatUrls?: string[];
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
  /** Appended to the system prompt, also when `contextText` is empty */
  systemNote: string;
  /** Untrusted web content, prepended to the current user message; may be empty */
  contextText: string;
  /** Provenance for the UI; never sent back to the LLM */
  grounding?: MessageGrounding;
}

/**
 * What the core reads from the output of an executing (non-provider) tool.
 * Everything else in the output is the tool's own business.
 */
export interface WebToolOutput {
  /** Merged into the message grounding shown in the UI */
  grounding?: MessageGrounding;
  /** Web searches this call ran, for usage statistics */
  searchQueries?: number;
}

export interface WebToolsProvider {
  /**
   * Build the `tools` object passed to `streamText()`.
   * Called once per request, so tools may keep per-request state in a closure.
   * @returns undefined when no web tool applies — the caller then omits `tools` entirely.
   */
  resolve(request: WebToolsRequest): Record<string, unknown> | undefined;

  /**
   * Step budget for tools that the SDK executes (call → result → answer).
   * Optional: absent or undefined means a single step, which is enough for
   * provider-executed tools. On the last step the core withdraws all tools and
   * tells the model to answer — keep it above the tools' own budgets, as a model
   * stripped of tools may write a fake call as text instead.
   */
  maxSteps?(request: WebToolsRequest): number | undefined;

  /**
   * Fetch web content up front and hand it back as prompt text.
   * Optional: providers served by native tools do not implement it.
   * Must not throw on network failures — return undefined instead.
   */
  prepareContext?(request: WebContextRequest): Promise<WebContextResult | undefined>;
}
