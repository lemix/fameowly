import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DATA_DIR } from "./paths";

// ─── Types ───────────────────────────────────────────────────────────

export interface ChatAttachment {
  type: "image" | "file";
  name: string;
  mimeType: string;
  /** For small files: base64 data. For large files: path to saved file */
  url: string;
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  attachments?: ChatAttachment[];
  createdAt: string;
}

export interface ChatUsageTotals {
  /** Append-only: deleting messages never gives spent tokens back */
  promptTokens: number;
  completionTokens: number;
  requests: number;
  /** Last exact context size reported by the provider */
  contextTokens: number;
  /** Chat revision the context measurement was taken at */
  contextRevision: number;
}

export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
  /** Updated only when messages change; used for sorting. Missing in old files — falls back to updatedAt. */
  lastMessageAt?: string;
  /** Bumped only when messages are removed; missing in old files means 0 */
  revision?: number;
  /** Token aggregate; absent when a plugin owns the consumption journal */
  usage?: ChatUsageTotals;
  messages: ChatMessageData[];
}

export interface ChatListItem {
  id: string;
  title: string;
  modelId: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
  /** Always populated (falls back to updatedAt for old chats) */
  lastMessageAt: string;
  messageCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const CHATS_DIR = path.join(DATA_DIR, "chats");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
}

function getUserDir(userId: string): string {
  const dir = path.join(CHATS_DIR, userId);
  ensureDir(dir);
  return dir;
}

function getChatFilePath(userId: string, chatId: string): string {
  return path.join(getUserDir(userId), `${chatId}.json`);
}

// ─── CRUD Operations ─────────────────────────────────────────────────

/** Get list of all chats for a user (sorted by updatedAt desc) */
export function getUserChats(userId: string): ChatListItem[] {
  const dir = getUserDir(userId);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  const chats: ChatListItem[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const chat: ChatSession = JSON.parse(raw);
      chats.push({
        id: chat.id,
        title: chat.title,
        modelId: chat.modelId,
        systemPrompt: chat.systemPrompt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        lastMessageAt: chat.lastMessageAt || chat.updatedAt,
        messageCount: chat.messages.length,
      });
    } catch {
      // skip corrupt files
    }
  }

  return chats.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

/** Get full chat session by ID */
export function getChat(userId: string, chatId: string): ChatSession | null {
  const filePath = getChatFilePath(userId, chatId);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as ChatSession;
  } catch {
    return null;
  }
}

/** Create a new chat session */
export function createChat(
  userId: string,
  modelId: string,
  title?: string,
  systemPrompt?: string
): ChatSession {
  const now = new Date().toISOString();
  const chat: ChatSession = {
    id: crypto.randomUUID(),
    title: title || "Новый чат",
    modelId,
    systemPrompt,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    revision: 0,
    messages: [],
  };
  const filePath = getChatFilePath(userId, chat.id);
  fs.writeFileSync(filePath, JSON.stringify(chat, null, 2));
  return chat;
}

/** Update chat (messages, title, etc.) */
export function updateChat(
  userId: string,
  chatId: string,
  updates: Partial<Pick<ChatSession, "title" | "messages" | "modelId" | "systemPrompt">>
): ChatSession | null {
  const chat = getChat(userId, chatId);
  if (!chat) return null;

  // Backward compat: initialize lastMessageAt for old chats that lack it
  if (!chat.lastMessageAt) {
    chat.lastMessageAt = chat.updatedAt;
  }

  if (updates.title !== undefined) chat.title = updates.title;
  if (updates.messages !== undefined) {
    // Appending leaves the context measurement valid; losing a message does not.
    const nextIds = new Set(updates.messages.map((m) => m.id));
    const removed = chat.messages.some((m) => !nextIds.has(m.id));
    if (removed) chat.revision = (chat.revision ?? 0) + 1;

    chat.messages = updates.messages;
    // Only update lastMessageAt when messages change (not on rename/model change)
    chat.lastMessageAt = new Date().toISOString();
  }
  if (updates.modelId !== undefined) chat.modelId = updates.modelId;
  if (updates.systemPrompt !== undefined) chat.systemPrompt = updates.systemPrompt;

  // Auto-title when messages are saved and title is still default
  if (chat.title === "Новый чат" && chat.messages.length > 0) {
    chat.title = autoTitle(chat.messages);
  }

  chat.updatedAt = new Date().toISOString();

  const filePath = getChatFilePath(userId, chatId);
  fs.writeFileSync(filePath, JSON.stringify(chat, null, 2));
  return chat;
}

/** Auto-generate a title from the first user message */
export function autoTitle(messages: ChatMessageData[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "Новый чат";
  const text = firstUser.content.trim();
  if (text.length <= 50) return text;
  return text.slice(0, 47) + "...";
}

/** Append messages to a chat and auto-title if needed */
export function appendMessages(
  userId: string,
  chatId: string,
  newMessages: ChatMessageData[]
): ChatSession | null {
  const chat = getChat(userId, chatId);
  if (!chat) return null;

  chat.messages.push(...newMessages);
  chat.updatedAt = new Date().toISOString();
  chat.lastMessageAt = chat.updatedAt;

  // Auto-title on first message
  if (chat.title === "Новый чат" && chat.messages.length > 0) {
    chat.title = autoTitle(chat.messages);
  }

  const filePath = getChatFilePath(userId, chatId);
  fs.writeFileSync(filePath, JSON.stringify(chat, null, 2));
  return chat;
}

/** Delete a specific message from a chat */
export function deleteMessage(
  userId: string,
  chatId: string,
  messageId: string
): ChatSession | null {
  const chat = getChat(userId, chatId);
  if (!chat) return null;

  const remaining = chat.messages.filter((m) => m.id !== messageId);
  if (remaining.length !== chat.messages.length) {
    chat.revision = (chat.revision ?? 0) + 1;
  }
  chat.messages = remaining;
  chat.updatedAt = new Date().toISOString();

  const filePath = getChatFilePath(userId, chatId);
  fs.writeFileSync(filePath, JSON.stringify(chat, null, 2));
  return chat;
}

/**
 * Add one request to the chat token aggregate.
 * Totals only grow; the context measurement is overwritten and stamped with
 * the revision it was taken at, so later deletions mark it as stale.
 */
export function recordChatUsage(
  userId: string,
  chatId: string,
  usage: { promptTokens: number; completionTokens: number }
): void {
  const chat = getChat(userId, chatId);
  if (!chat) return;

  const totals = chat.usage;
  chat.usage = {
    promptTokens: (totals?.promptTokens ?? 0) + usage.promptTokens,
    completionTokens: (totals?.completionTokens ?? 0) + usage.completionTokens,
    requests: (totals?.requests ?? 0) + 1,
    contextTokens: usage.promptTokens + usage.completionTokens,
    contextRevision: chat.revision ?? 0,
  };

  const filePath = getChatFilePath(userId, chatId);
  fs.writeFileSync(filePath, JSON.stringify(chat, null, 2));
}

/** Delete a chat session */
export function deleteChat(userId: string, chatId: string): boolean {
  const filePath = getChatFilePath(userId, chatId);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

