/**
 * Contract: LLM model factory — creates AI SDK model instances.
 */

import type { ResolvedCredentials } from "../types";

export interface ModelFactory {
  /**
   * Create an AI SDK language model from resolved credentials.
   * @returns model instance, or null when the credentials cannot produce one
   */
  create(
    credentials: ResolvedCredentials,
    modelId: string,
  ): unknown | null;
}
