/**
 * Plugin loader — registers strategies in the DI container at startup.
 *
 * Resolution order:
 * 1. Register OSS defaults (VirtualProviderCredentialResolver, BaseModelFactory, ChatTotalsUsageTracker)
 * 2. If extension plugins are present and ENABLE_PLUGINS !== "false",
 *    load plugins — each calls container.register() to override.
 *
 * Uses the @plugins build-time alias (resolved by tsconfig + next.config).
 */

import { container } from "./container";
import { VirtualProviderCredentialResolver } from "./strategies/virtual-provider-credential-resolver";
import { BaseModelFactory } from "./strategies/base-model-factory";
import { ChatTotalsUsageTracker } from "./strategies/chat-totals-usage-tracker";
import { plugins as extensionPlugins } from "@plugins";

let _initialized = false;

/**
 * Initialize the DI container with default strategies.
 * Safe to call multiple times — only runs once.
 */
export function initializeContainer(): void {
  if (_initialized) return;
  _initialized = true;

  // OSS defaults — virtual provider resolver handles both VP + .env fallback
  container.register("providerResolver", new VirtualProviderCredentialResolver());
  container.register("modelFactory", new BaseModelFactory());
  container.register("usageTracker", new ChatTotalsUsageTracker());

  // Extension plugins override via container.register()
  loadExtensionPlugins();
}

/**
 * Load extension plugins — they call container.register() to override strategies.
 */
function loadExtensionPlugins(): void {
  if (process.env.ENABLE_PLUGINS === "false") return;
  if (!Array.isArray(extensionPlugins) || extensionPlugins.length === 0) return;

  for (const plugin of extensionPlugins) {
    if (typeof plugin.register === "function") {
      plugin.register(container);
    }
  }
}

/** Re-export container for convenience */
export { container } from "./container";
