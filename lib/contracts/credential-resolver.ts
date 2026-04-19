/**
 * Contract: provider resolution for LLM model requests.
 * Implementations decide how to map (modelId, provider, role) → API credentials.
 */

import type { ResolvedCredentials } from "../types";

export interface ProviderResolver {
  /**
   * Resolve API credentials for a model request.
   * @returns credentials, or null if this resolver cannot handle the request
   */
  resolve(
    modelId: string,
    provider: string,
    userRole: string,
  ): ResolvedCredentials | null;
}
