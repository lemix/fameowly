import fs from "fs";
import path from "path";
import crypto from "crypto";

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

export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageData[];
}

export interface ChatListItem {
  id: string;
  title: string;
  modelId: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const CHATS_DIR = path.join(DATA_DIR, "chats");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

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
        messageCount: chat.messages.length,
      });
    } catch {
      // skip corrupt files
    }
  }

  return chats.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
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

  if (updates.title !== undefined) chat.title = updates.title;
  if (updates.messages !== undefined) chat.messages = updates.messages;
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

  chat.messages = chat.messages.filter((m) => m.id !== messageId);
  chat.updatedAt = new Date().toISOString();

  const filePath = getChatFilePath(userId, chatId);
  fs.writeFileSync(filePath, JSON.stringify(chat, null, 2));
  return chat;
}

/** Delete a chat session */
export function deleteChat(userId: string, chatId: string): boolean {
  const filePath = getChatFilePath(userId, chatId);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

// ─── File Upload ─────────────────────────────────────────────────────

const MAX_BASE64_SIZE = 512 * 1024; // 512KB — inline as base64

/**
 * Save an uploaded file. Small images go as base64 data URIs,
 * larger files get saved to public/uploads/.
 */
export function saveUploadedFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): string {
  if (buffer.length <= MAX_BASE64_SIZE && mimeType.startsWith("image/")) {
    // Return as data URI for small images
    const b64 = buffer.toString("base64");
    return `data:${mimeType};base64,${b64}`;
  }

  // Save to disk
  ensureDir(UPLOADS_DIR);
  const ext = path.extname(fileName) || ".bin";
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, uniqueName);
  fs.writeFileSync(filePath, buffer);
  return `/api/files/${uniqueName}`;
}
