/**
 * Builds AI SDK CoreMessage[] from the client payload, resolving stored
 * attachments into inline data. Kept out of the route so the route only wires
 * strategies together.
 */

import { resizeBase64Image } from "../image-resize";
import { resolveFileUrl } from "../file-storage";
import { sanitizeMessagesForLLM } from "../reasoning/context-sanitizer";
import type { ChatAttachment } from "../chat-store";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; mimeType?: string }
  | { type: "file"; data: string; mediaType: string };

export type CoreChatMessage =
  | { role: "user"; content: ContentPart[] }
  | { role: "assistant"; content: string };

export interface ApiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
}

const DATA_URL = /^data:(.*?);base64,(.*)$/;

function readAttachment(att: ChatAttachment): { data: string; mimeType: string } | null {
  const match = att.url.match(DATA_URL);
  if (match) return { data: match[2], mimeType: match[1] };
  const resolved = resolveFileUrl(att.url);
  return resolved ? { data: resolved.data, mimeType: resolved.mimeType } : null;
}

async function attachmentToPart(att: ChatAttachment): Promise<ContentPart | null> {
  const resolved = readAttachment(att);
  if (!resolved) return null;

  if (att.mimeType.startsWith("image/")) {
    try {
      const resized = await resizeBase64Image(resolved.data, resolved.mimeType);
      return { type: "image", image: resized.data, mimeType: resized.mimeType };
    } catch {
      return { type: "image", image: resolved.data, mimeType: resolved.mimeType };
    }
  }

  if (att.mimeType.startsWith("text/") || att.mimeType === "application/json") {
    try {
      const text = Buffer.from(resolved.data, "base64").toString("utf-8");
      return text ? { type: "text", text: `[Файл: ${att.name}]\n${text}` } : null;
    } catch {
      return null;
    }
  }

  return {
    type: "file",
    data: `data:${resolved.mimeType};base64,${resolved.data}`,
    mediaType: resolved.mimeType,
  };
}

/**
 * Convert API messages into CoreMessage[].
 * Assistant history is sanitized first: reasoning blocks are stripped and URLs
 * are neutralized, so enabling URL Context never re-fetches links from old replies.
 */
export async function buildCoreMessages(messages: ApiMessage[]): Promise<CoreChatMessage[]> {
  const sanitized = sanitizeMessagesForLLM(messages);
  const core: CoreChatMessage[] = [];

  for (const msg of sanitized) {
    if (msg.role === "assistant") {
      // Empty `parts` breaks Vertex/Gemini on the next request
      if (msg.content?.trim()) core.push({ role: "assistant", content: msg.content });
      continue;
    }

    const parts: ContentPart[] = [];
    if (msg.content) parts.push({ type: "text", text: msg.content });
    for (const att of msg.attachments ?? []) {
      const part = await attachmentToPart(att);
      if (part) parts.push(part);
    }
    if (parts.length > 0) core.push({ role: "user", content: parts });
  }

  return core;
}
