/**
 * Usage store — CRUD for token usage records (data/usage/).
 * Stores per-user JSON files: data/usage/{userId}.json
 *
 * This is core data access infrastructure.
 * The actual tracking logic lives in the UsageTracker strategy.
 */

import fs from "fs";
import path from "path";
import { DATA_DIR } from "./paths";
import type { UsageRecord } from "./types";

const USAGE_DIR = path.join(DATA_DIR, "usage");

function ensureUsageDir(): void {
  if (!fs.existsSync(USAGE_DIR)) {
    fs.mkdirSync(USAGE_DIR, { recursive: true, mode: 0o755 });
  }
}

function userFile(userId: string): string {
  return path.join(USAGE_DIR, `${userId}.json`);
}

/** Read all usage records for a user */
export function getUserUsage(userId: string): UsageRecord[] {
  try {
    const file = userFile(userId);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
  } catch (err) {
    console.error(`Failed to read usage for user ${userId}:`, err);
  }
  return [];
}

/** Append a usage record for a user */
export function addUsageRecord(userId: string, record: UsageRecord): void {
  ensureUsageDir();
  const records = getUserUsage(userId);
  records.push(record);
  fs.writeFileSync(userFile(userId), JSON.stringify(records, null, 2));
}
