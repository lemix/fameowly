import path from "path";

/**
 * Root directory for all runtime data (users, chats, uploads, usage, configs).
 * Override with the DATA_DIR env var to run several instances (e.g. premium and
 * open-source builds) side by side without sharing state.
 */
export const DATA_DIR = path.resolve(
  process.env.DATA_DIR || path.join(process.cwd(), "data"),
);

/** Resolve a path inside the runtime data directory */
export function dataPath(...segments: string[]): string {
  return path.join(DATA_DIR, ...segments);
}
