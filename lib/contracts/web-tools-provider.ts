/**
 * Contract: provider-native web tools (live search, URL reading).
 *
 * The OSS strategy wires Google's `google_search` / `url_context` tools.
 * Plugins can replace it to add their own fetchers for other providers.
 */

import type { BaseProvider } from "../types";

export interface WebToolsRequest {
  baseProvider: BaseProvider;
  /** User enabled live web search for this chat */
  webSearchEnabled: boolean;
  /** The current user message contains at least one fetchable public URL */
  urlContextRequested: boolean;
}

export interface WebToolsProvider {
  /**
   * Build the `tools` object passed to `streamText()`.
   * @returns undefined when no web tool applies — the caller then omits `tools` entirely.
   */
  resolve(request: WebToolsRequest): Record<string, unknown> | undefined;
}
