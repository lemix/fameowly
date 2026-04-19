/**
 * Provider resolver — thin facade delegating to the DI container.
 * Kept for backward compatibility. New code should use container directly.
 */

import { initializeContainer, container } from "./plugin-loader";
import type { ResolvedCredentials } from "./types";

/**
 * Resolve credentials for a model request.
 * @deprecated Use container.get("providerResolver").resolve() instead
 */
export function resolveCredentials(
  modelId: string,
  provider: string,
  userRole: string,
): ResolvedCredentials {
  initializeContainer();
  return container.get("providerResolver").resolve(modelId, provider, userRole)!;
}
