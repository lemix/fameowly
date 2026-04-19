/**
 * Contract: LLM model factory — creates AI SDK model instances.
 */

import type { ResolvedCredentials } from "../types";

export interface ModelFactory {
  /**
   * Create an AI SDK language model from resolved credentials.
   * @returns model instance, or null if provider is handled externally (e.g. local)
   */
  create(
    credentials: ResolvedCredentials,
    modelId: string,
  ): unknown | null;
}
