/**
 * Plugin stub registry — defines all extension plugin components that
 * require OSS stubs. When a new plugin is created in the plugins directory, a
 * corresponding entry MUST be added here so the OSS build resolves
 * all static imports.
 *
 * Format: each key is a UI slot id (admin tab ids are slots too),
 * value describes the import path and the named export.
 *
 * This file is the SINGLE SOURCE OF TRUTH for:
 *   1. `scripts/ensure-premium-stub.js` — generates plugin directory stubs
 *   2. `lib/plugin-ui.tsx` — static loader map for dynamic imports
 *   3. `lib/plugin-stubs/` — permanent OSS fallback components
 */

/** @type {Record<string, { importPath: string; exportName: string }>} */
const pluginStubs = {
  providers: {
    importPath: "providers/components/provider-manager",
    exportName: "ProviderManager",
  },
  models: {
    importPath: "providers/components/model-manager",
    exportName: "ModelManager",
  },
  "usage-page": {
    importPath: "billing/components/usage-page",
    exportName: "UsagePage",
  },
  "user-usage": {
    importPath: "billing/components/user-usage-modal",
    exportName: "UserUsageModal",
  },
  "user-month-usage": {
    importPath: "billing/components/user-month-usage",
    exportName: "UserMonthUsage",
  },
  "chat-usage": {
    importPath: "billing/components/chat-usage-badge",
    exportName: "ChatUsageBadge",
  },
  "user-profile": {
    importPath: "billing/components/user-profile-cell",
    exportName: "UserProfileCell",
  },
  "user-filter": {
    importPath: "billing/components/user-filter",
    exportName: "UserFilter",
  },
  "rate-plans": {
    importPath: "billing/components/rate-plan-manager",
    exportName: "RatePlanManager",
  },
  "tags": {
    importPath: "billing/components/tag-manager",
    exportName: "TagManager",
  },
  finance: {
    importPath: "billing/components/finance-panel",
    exportName: "FinancePanel",
  },
  // ── Add new plugin component stubs below ──────────────────────────
};

module.exports = { pluginStubs };
