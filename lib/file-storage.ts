// lib/file-storage.ts — Centralized file storage with per-user isolation

import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const MAX_BASE64_SIZE = 512 * 1024; // 512KB — inline as base64

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
 * Small images → base64 data URI (inline), large files → disk.
 */
export function saveUploadedFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  userId: string
): string {
  // Small images as data URIs
  if (buffer.length <= MAX_BASE64_SIZE && mimeType.startsWith("image/")) {
    const b64 = buffer.toString("base64");
    return `data:${mimeType};base64,${b64}`;
  }

  // Save to user's directory
  const userDir = path.join(UPLOADS_DIR, userId);
  ensureDir(userDir);
  const ext = path.extname(fileName) || ".bin";
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(userDir, uniqueName);
  fs.writeFileSync(filePath, buffer);
  return `/api/files/${userId}/${uniqueName}`;
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
