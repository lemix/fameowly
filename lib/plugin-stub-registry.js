/**
 * Plugin stub registry — defines all premium plugin components that
 * require OSS stubs. When a new plugin is created in premium/, a
 * corresponding entry MUST be added here so the OSS build resolves
 * all static imports.
 *
 * Format: each key is the plugin admin tab id (used in admin page loader),
 * value describes the import path and the named export.
 *
 * This file is the SINGLE SOURCE OF TRUTH for:
 *   1. `scripts/ensure-premium-stub.js` — generates premium/ stubs
 *   2. `app/admin/page.tsx` — static loader map for dynamic imports
 *   3. `lib/premium-stubs/` — permanent OSS fallback components
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
  // ── Add new plugin component stubs below ──────────────────────────
  // billing: {
  //   importPath: "billing/components/billing-dashboard",
  //   exportName: "BillingDashboard",
  // },
};

module.exports = { pluginStubs };
