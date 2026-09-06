/**
 * Plugin bridge — the single bridge between open-source core and
 * extension plugins. Loads the plugin registry from @plugins and delegates
 * to plugin hooks. When plugins directory is absent, all functions are no-ops
 * and fall through to base implementations.
 *
 * @plugins is a tsconfig/turbopack alias:
 *   - When plugins directory is present → resolves to ./premium (or any custom folder)
 *   - When absent → resolves to ./lib/plugin-stub (empty array)
 */

import type {
  Plugin,
  ResolvedCredentials,
  TokenUsage,
  PluginAdminTab,
  PluginRouteHandler,
} from "./types";

// Import plugin registry — aliased at build time
import { plugins as registeredPlugins } from "@plugins";

// ─── Core API ────────────────────────────────────────────────────────

/** All loaded plugins */
export function getPlugins(): Plugin[] {
  if (process.env.ENABLE_PLUGINS === "false") return [];
  return registeredPlugins;
}

/** Whether any extension plugins are loaded */
export function hasPlugins(): boolean {
  return getPlugins().length > 0;
}

/**
 * Resolve credentials via plugins, then fall through to base resolver.
 * Plugins are tried in order; first non-null result wins.
 */
export function pluginResolveCredentials(
  modelId: string,
  provider: string,
  userRole: string,
): ResolvedCredentials | null {
  for (const plugin of getPlugins()) {
    if (plugin.resolveCredentials) {
      const result = plugin.resolveCredentials(modelId, provider, userRole);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Create provider model via plugins. First non-undefined result wins.
 */
export function pluginCreateProviderModel(
  credentials: ResolvedCredentials,
  modelId: string,
): unknown | undefined {
  for (const plugin of getPlugins()) {
    if (plugin.createProviderModel) {
      const result = plugin.createProviderModel(credentials, modelId);
      if (result !== undefined) return result;
    }
  }
  return undefined;
}

/** Notify all plugins that a chat generation finished */
export async function pluginOnChatFinish(
  userId: string,
  modelId: string,
  usage: TokenUsage,
): Promise<void> {
  for (const plugin of getPlugins()) {
    if (plugin.onChatFinish) {
      await plugin.onChatFinish(userId, modelId, usage);
    }
  }
}

/** Notify all plugins that an image generation finished */
export async function pluginOnImageFinish(
  userId: string,
  modelId: string,
): Promise<void> {
  for (const plugin of getPlugins()) {
    if (plugin.onImageFinish) {
      await plugin.onImageFinish(userId, modelId);
    }
  }
}

/**
 * Run plugin middleware hooks. First non-null response short-circuits.
 */
export async function pluginMiddleware(
  req: import("next/server").NextRequest,
  session: { userId: string; name: string; role: string },
): Promise<import("next/server").NextResponse | null> {
  for (const plugin of getPlugins()) {
    if (plugin.middleware) {
      const response = await plugin.middleware(req, session);
      if (response) return response;
    }
  }
  return null;
}

/** Collect all admin tabs from all plugins */
export function getAdminTabs(): PluginAdminTab[] {
  return getPlugins().flatMap((p) => p.adminTabs ?? []);
}

/** Ids of all UI slots filled by plugins; an admin tab is a slot with a label */
export function getUiSlots(): string[] {
  return [
    ...new Set(
      getPlugins().flatMap((p) => [
        ...(p.uiSlots ?? []),
        ...(p.adminTabs ?? []).map((t) => t.id),
      ]),
    ),
  ];
}

/** Find a plugin API route handler */
export function getPluginRoute(
  path: string,
  method: string,
): PluginRouteHandler | null {
  for (const plugin of getPlugins()) {
    const handler = plugin.apiRoutes?.[path]?.[method];
    if (handler) return handler;
  }
  return null;
}
