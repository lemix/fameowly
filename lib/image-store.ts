import fs from "fs";
import path from "path";
import crypto from "crypto";

// ─── Types ───────────────────────────────────────────────────────────

export interface ImageHistoryItem {
  id: string;
  prompt: string;
  imageUrl: string | null;
  error?: string;
  modelId: string;
  modelName: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
}

function getUserHistoryFile(userId: string): string {
  const dir = path.join(IMAGES_DIR, userId);
  ensureDir(dir);
  return path.join(dir, "history.json");
}

// ─── CRUD Operations ─────────────────────────────────────────────────

/** Get all image generation history for a user (newest first) */
export function getImageHistory(userId: string): ImageHistoryItem[] {
  const filePath = getUserHistoryFile(userId);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as ImageHistoryItem[];
  } catch {
    return [];
  }
}

function saveHistory(userId: string, history: ImageHistoryItem[]): void {
  const filePath = getUserHistoryFile(userId);
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
}

/** Add a new item to the beginning of history */
export function addImageHistoryItem(
  userId: string,
  item: ImageHistoryItem
): void {
  const history = getImageHistory(userId);
  history.unshift(item);
  saveHistory(userId, history);
}

/** Delete an item from history and its image file */
export function deleteImageHistoryItem(
  userId: string,
  itemId: string
): boolean {
  const history = getImageHistory(userId);
  const idx = history.findIndex((h) => h.id === itemId);
  if (idx === -1) return false;

  // Delete the image file if stored on disk
  const item = history[idx];
  if (item.imageUrl && item.imageUrl.startsWith("/api/files/")) {
    const relativePath = item.imageUrl.replace("/api/files/", "");
    const filePath = path.join(UPLOADS_DIR, relativePath);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }

  history.splice(idx, 1);
  saveHistory(userId, history);
  return true;
}

// ─── Image File Storage ──────────────────────────────────────────────

/** Save a base64-encoded image to disk and return the public URL */
export function saveGeneratedImage(
  base64Data: string,
  mimeType: string
): string {
  const genDir = path.join(UPLOADS_DIR, "generated");
  ensureDir(genDir);

  const ext = mimeType.includes("png")
    ? ".png"
    : mimeType.includes("webp")
      ? ".webp"
      : ".jpg";
  const fileName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(genDir, fileName);

  const buffer = Buffer.from(base64Data, "base64");
  fs.writeFileSync(filePath, buffer);

  return `/api/files/generated/${fileName}`;
}
