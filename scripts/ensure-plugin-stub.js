/**
 * Ensures the extensions directory contains valid TypeScript stubs when
 * the git submodule is not checked out. Runs automatically via
 * `postinstall` and before OSS dev/build commands.
 *
 * If the real submodule is present, exits immediately.
 * Otherwise creates a minimal stub so tsconfig path resolution succeeds.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pluginsDir = path.join(root, "extensions");
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

console.log("[plugin-stub] Creating stub extensions directory...");

// ── Create extensions/index.ts ──────────────────────────────────
fs.mkdirSync(pluginsDir, { recursive: true });
fs.writeFileSync(
  indexFile,
  [
    "// Auto-generated stub — do not edit (created by scripts/ensure-plugin-stub.js)",
    'import type { Plugin } from "../lib/types";',
    "export const plugins: Plugin[] = [];",
    "",
  ].join("\n"),
);

console.log("[plugin-stub] Created extensions/index.ts");
