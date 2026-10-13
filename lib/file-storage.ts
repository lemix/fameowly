// lib/file-storage.ts — Centralized file storage with per-user isolation

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DATA_DIR } from "./paths";

const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
}

/** Shared MIME type map */
export const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
};

/**
 * Save an uploaded file to the user's directory.
 * Never inline as base64: the client resends the whole history on every request,
 * and Next.js middleware truncates request bodies above 10 MB.
 */
export function saveUploadedFile(
  buffer: Buffer,
  fileName: string,
  userId: string
): string {
  const userDir = path.join(UPLOADS_DIR, userId);
  ensureDir(userDir);
  const ext = path.extname(fileName) || ".bin";
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(userDir, uniqueName);
  fs.writeFileSync(filePath, buffer);
  return `/api/files/${userId}/${uniqueName}`;
}

/** Move a legacy inline data: URL to the user's uploads; other URLs pass through. */
function externalizeDataUrl(url: string, userId: string): string {
  const match = url.match(/^data:(.*?);base64,([\s\S]*)$/);
  if (!match) return url;
  const [, mimeType, b64] = match;
  const ext = Object.keys(MIME_TYPES).find((e) => MIME_TYPES[e] === mimeType) ?? ".bin";
  const buffer = Buffer.from(b64, "base64");
  // Content-addressed: a stale tab resending the same data URL never duplicates the file
  const name = `${crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 32)}${ext}`;
  const userDir = path.join(UPLOADS_DIR, userId);
  ensureDir(userDir);
  const filePath = path.join(userDir, name);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, buffer);
  return `/api/files/${userId}/${name}`;
}

/** Rewrite inline attachments in place; returns true when anything changed. */
export function externalizeAttachments(
  messages: { attachments?: { url: string }[] }[],
  userId: string
): boolean {
  let changed = false;
  for (const att of messages.flatMap((m) => m.attachments ?? [])) {
    const url = externalizeDataUrl(att.url, userId);
    if (url !== att.url) {
      att.url = url;
      changed = true;
    }
  }
  return changed;
}

/**
 * Resolve a file URL (/api/files/... or data:...) to raw base64 + mimeType.
 * Checks both user-scoped paths and legacy flat paths for backward compatibility.
 */
export function resolveFileUrl(
  url: string
): { data: string; mimeType: string } | null {
  try {
    if (url.startsWith("data:")) {
      const match = url.match(/^data:(.*?);base64,(.*)$/);
      if (match) return { mimeType: match[1], data: match[2] };
      return null;
    }
    if (url.startsWith("/api/files/")) {
      const relativePath = url.replace("/api/files/", "");
      const filePath = path.resolve(UPLOADS_DIR, relativePath);
      // Security: prevent directory traversal
      if (!filePath.startsWith(UPLOADS_DIR)) return null;
      if (!fs.existsSync(filePath)) return null;
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || "application/octet-stream";
      return { data: buffer.toString("base64"), mimeType };
    }
  } catch {
    /* ignore */
  }
  return null;
}
