/**
 * Provider factory — thin facade delegating to the DI container.
 * Kept for backward compatibility. New code should use container directly.
 */

import { initializeContainer, container } from "../plugin-loader";
import type { ResolvedCredentials } from "../types";

/**
 * @deprecated Use container.get("modelFactory").create() instead
 */
export function createProviderModel(
  credentials: ResolvedCredentials,
  modelId: string,
) {
  initializeContainer();
  return container.get("modelFactory").create(credentials, modelId);
}
