// lib/types.ts — Shared client-side types

// Server types re-exported for convenience.
// IMPORTANT: use `export type` to ensure tree-shaking —
// these modules import `fs`/`path` which must NOT be bundled into client code.
export type { ModelOption, ModelsConfig, ModelTier } from "./models";
export type {
  ChatListItem,
  ChatAttachment,
  ChatSession,
  ChatMessageData,
} from "./chat-store";
export type { ImageHistoryItem } from "./image-store";

// Import for local use in type definitions
import type { ChatAttachment } from "./chat-store";
import type { UserRole } from "./auth";

export type { UserRole } from "./auth";

export type Mode = "chat" | "image";
export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

/** Client-side user info (no password) */
export interface UserInfo {
  id: string;
  name: string;
  role: UserRole;
}

export interface PendingAttachment {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded?: ChatAttachment;
}

export interface SystemPromptPreset {
  id: string;
  name: string;
  prompt: string;
}

/** Client-side image history item (createdAt is Date, not string) */
export interface ImageHistoryItemClient {
  id: string;
  prompt: string;
  imageUrl: string | null;
  error?: string;
  modelId: string;
  modelName: string;
  createdAt: Date;
  referenceFiles?: Array<{ url: string; name: string; mimeType: string }>;
  aspectRatio?: string;
  resolution?: string;
}

/** Client-side message (createdAt is Date | string | undefined) */
export interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  error?: string;
  attachments?: ChatAttachment[];
  createdAt?: Date | string;
}
