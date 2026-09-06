/**
 * Plugin bridge — the single bridge between open-source core and
 * extension plugins. Exposes the UI slots, admin tabs and API routes that
 * plugins contribute. Behaviour overrides go through the DI container
 * instead (see lib/container.ts and lib/plugin-loader.ts).
 *
 * @plugins is a tsconfig/turbopack alias:
 *   - When the extensions directory is present → resolves to ./extensions
 *   - When absent → resolves to ./lib/plugin-stub (empty array)
 */

import type {
  Plugin,
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
