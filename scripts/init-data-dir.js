/**
 * Prepares a runtime data directory (DATA_DIR, default ./data).
 *
 * Used to bootstrap an isolated directory for open-source runs so they never
 * touch premium data. Existing files are never overwritten; the admin user is
 * seeded lazily by lib/auth.ts on first login.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, "data"));

const SUBDIRS = ["chats", "images", "usage", "uploads", "uploads/generated"];

fs.mkdirSync(dataDir, { recursive: true });
for (const dir of SUBDIRS) {
  fs.mkdirSync(path.join(dataDir, dir), { recursive: true });
}

const modelsFile = path.join(dataDir, "models.json");
const example = path.join(root, "data", "models.json.example");
if (!fs.existsSync(modelsFile) && fs.existsSync(example)) {
  fs.copyFileSync(example, modelsFile);
  console.log(`[init-data-dir] Seeded models.json from example.`);
}

console.log(`[init-data-dir] Ready: ${dataDir}`);
