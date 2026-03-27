import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { proxyFetch } from "@/lib/proxy-fetch";
import { resizeBase64Image } from "@/lib/image-resize";
import fs from "fs";
import path from "path";

export const maxDuration = 120;

const DEFAULT_SYSTEM_PROMPT = `Ты — полезный AI-ассистент в семейном хабе. Отвечай на русском языке, если пользователь пишет на русском. Будь дружелюбным и полезным.`;

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

/** Resolve a file URL (/api/files/... or data:...) to raw base64 + mimeType */
function resolveFileUrl(url: string): { data: string; mimeType: string } | null {
  try {
    if (url.startsWith("data:")) {
      const match = url.match(/^data:(.*?);base64,(.*)$/);
      if (match) return { mimeType: match[1], data: match[2] };
      return null;
    }
    if (url.startsWith("/api/files/")) {
      const relativePath = url.replace("/api/files/", "");
      const filePath = path.resolve(UPLOADS_DIR, relativePath);
      if (!filePath.startsWith(UPLOADS_DIR)) return null;
      if (!fs.existsSync(filePath)) return null;
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
        ".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown",
        ".json": "application/json", ".csv": "text/csv",
      };
      const mimeType = mimeMap[ext] || "application/octet-stream";
      return { data: buffer.toString("base64"), mimeType };
    }
  } catch { /* ignore */ }
  return null;
}

interface ChatAttachment {
  type: "image" | "file";
  name: string;
  mimeType: string;
  url: string;
}

interface ApiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages,
      model: modelId,
      provider,
      systemPrompt,
    } = body as {
      messages: ApiMessage[];
      model: string;
      provider: string;
      systemPrompt?: string;
    };

    if (!messages || !modelId || !provider) {
      return new Response(
        JSON.stringify({ error: "Отсутствуют обязательные поля запроса" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const system = systemPrompt || DEFAULT_SYSTEM_PROMPT;

    // Build CoreMessage[] directly — resolving file attachments to inline data
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image"; image: string; mimeType?: string }
      | { type: "file"; data: string; mediaType: string };

    const coreMessages: Array<
      | { role: "user"; content: ContentPart[] }
      | { role: "assistant"; content: string }
    > = [];

    for (const msg of messages) {
      if (msg.role === "user") {
        const contentParts: ContentPart[] = [];

        if (msg.content) {
          contentParts.push({ type: "text", text: msg.content });
        }

        if (msg.attachments?.length) {
          for (const att of msg.attachments) {
            if (att.mimeType.startsWith("image/")) {
              // Images: extract raw base64 + mimeType, resize for smaller payload
              let imgBase64: string | null = null;
              let imgMime = att.mimeType;

              if (att.url.startsWith("data:")) {
                const match = att.url.match(/^data:(.*?);base64,(.*)$/);
                if (match) {
                  imgBase64 = match[2];
                  imgMime = match[1];
                }
              } else {
                const resolved = resolveFileUrl(att.url);
                if (resolved) {
                  imgBase64 = resolved.data;
                  imgMime = resolved.mimeType;
                }
              }

              if (imgBase64) {
                try {
                  const resized = await resizeBase64Image(imgBase64, imgMime);
                  contentParts.push({
                    type: "image",
                    image: resized.data,
                    mimeType: resized.mimeType,
                  });
                } catch {
                  contentParts.push({
                    type: "image",
                    image: imgBase64,
                    mimeType: imgMime,
                  });
                }
              }
            } else if (
              att.mimeType.startsWith("text/") ||
              att.mimeType === "application/json"
            ) {
              // Text files: read content and include as text
              try {
                let textContent: string;
                if (att.url.startsWith("data:")) {
                  const match = att.url.match(/^data:.*?;base64,(.*)$/);
                  textContent = match
                    ? Buffer.from(match[1], "base64").toString("utf-8")
                    : "";
                } else {
                  const resolved = resolveFileUrl(att.url);
                  textContent = resolved
                    ? Buffer.from(resolved.data, "base64").toString("utf-8")
                    : "";
                }
                if (textContent) {
                  contentParts.push({
                    type: "text",
                    text: `[Файл: ${att.name}]\n${textContent}`,
                  });
                }
              } catch { /* skip unreadable files */ }
            } else {
              // Other files (PDF etc.): send as file part
              if (att.url.startsWith("data:")) {
                contentParts.push({
                  type: "file",
                  data: att.url,
                  mediaType: att.mimeType,
                });
              } else {
                const resolved = resolveFileUrl(att.url);
                if (resolved) {
                  contentParts.push({
                    type: "file",
                    data: `data:${resolved.mimeType};base64,${resolved.data}`,
                    mediaType: resolved.mimeType,
                  });
                }
              }
            }
          }
        }

        if (contentParts.length === 0) {
          contentParts.push({ type: "text", text: "" });
        }

        coreMessages.push({ role: "user", content: contentParts });
      } else if (msg.role === "assistant") {
        coreMessages.push({ role: "assistant", content: msg.content || "" });
      }
    }

    let result;

    if (provider === "google") {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        fetch: proxyFetch,
      });
      result = streamText({
        model: google(modelId),
        system,
        messages: coreMessages,
      });
    } else if (provider === "openrouter") {
      const openrouter = createOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        fetch: proxyFetch,
      });
      result = streamText({
        model: openrouter.chat(modelId),
        system,
        messages: coreMessages,
      });
    } else {
      return new Response(
        JSON.stringify({ error: `Неизвестный провайдер: ${provider}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message =
      error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** Save completed messages after streaming finishes (called from client) */
export async function PATCH(req: Request) {
  // This endpoint is reserved for future server-side message persistence hooks.
  // Currently persistence is handled via /api/chats PATCH.
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
