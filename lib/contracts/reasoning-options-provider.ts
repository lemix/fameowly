/**
 * Contract: provider-native reasoning options.
 *
 * Splits two independent concerns:
 *  - visibility  — always ask the provider to return its reasoning, where it can;
 *  - control     — the «Думать» toggle, which only some providers can honour.
 */

import type { BaseProvider } from "../types";

export interface ReasoningOptionsRequest {
  baseProvider: BaseProvider;
  modelId: string;
  /** The «Думать» toggle. Undefined when the model exposes no toggle. */
  reasoningEnabled?: boolean;
}

export interface ReasoningOptionsProvider {
  /**
   * Build the `providerOptions` object passed to `streamText()`.
   * @returns undefined when the provider needs no options.
   */
  resolve(request: ReasoningOptionsRequest): Record<string, unknown> | undefined;
}
