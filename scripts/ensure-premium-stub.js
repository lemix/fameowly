/**
 * Ensures the plugins directory contains valid TypeScript stubs when
 * the git submodule is not checked out. Runs automatically via
 * `postinstall` and before OSS dev/build commands.
 *
 * If the real submodule is present, exits immediately.
 * Otherwise creates minimal stubs so tsconfig path resolution succeeds.
 *
 * Stub definitions are read from lib/plugin-stub-registry.js — the single
 * source of truth for all plugin components that need OSS fallbacks.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pluginsDir = path.join(root, "premium");
const indexFile = path.join(pluginsDir, "index.ts");

// ── Guard: skip if real submodule is present ─────────────────────────
// .git inside the plugins directory is the submodule marker
const submoduleMarker = path.join(pluginsDir, ".git");
if (fs.existsSync(submoduleMarker)) {
  console.log("[plugin-stub] Submodule detected, skipping.");
  process.exit(0);
}

// Also skip if index.ts exists and is NOT a generated stub
if (fs.existsSync(indexFile)) {
  const content = fs.readFileSync(indexFile, "utf-8");
  if (!content.includes("Auto-generated stub")) {
    console.log("[plugin-stub] Real plugins index.ts found, skipping.");
    process.exit(0);
  }
}

// ── Load stub registry ───────────────────────────────────────────────
const { pluginStubs } = require(path.join(root, "lib", "plugin-stub-registry.js"));

console.log("[plugin-stub] Creating stub plugins directory...");

// ── Create plugins/index.ts ──────────────────────────────────────────
fs.mkdirSync(pluginsDir, { recursive: true });
fs.writeFileSync(
  indexFile,
  [
    "// Auto-generated stub — do not edit (created by scripts/ensure-premium-stub.js)",
    'import type { Plugin } from "../lib/types";',
    "export const plugins: Plugin[] = [];",
    "",
  ].join("\n"),
);

// ── Create component stubs from registry ─────────────────────────────
for (const [id, entry] of Object.entries(pluginStubs)) {
  const { importPath, exportName } = entry;
  const filePath = path.join(pluginsDir, "plugins", importPath + ".tsx");

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    [
      `// Auto-generated stub for plugin "${id}" — do not edit`,
      '"use client";',
      `export function ${exportName}() { return null; }`,
      "",
    ].join("\n"),
  );
}

console.log(
  `[plugin-stub] Created ${Object.keys(pluginStubs).length + 1} stub files.`,
);

// ── Also ensure lib/plugin-stubs/ is in sync ────────────────────────
// These are used by next.config.ts bundler aliases when ENABLE_PLUGINS=false
const stubsDir = path.join(root, "lib", "plugin-stubs");
for (const [id, entry] of Object.entries(pluginStubs)) {
  const { importPath, exportName } = entry;
  const filePath = path.join(stubsDir, importPath + ".tsx");

  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      [
        `"use client";`,
        ``,
        `/** Stub: rendered when "${id}" plugin is not available */`,
        `export function ${exportName}() {`,
        `  return null;`,
        `}`,
        ``,
      ].join("\n"),
    );
    console.log(`[plugin-stub] Created lib stub: ${importPath}.tsx`);
  }
}
