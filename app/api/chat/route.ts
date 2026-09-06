import { streamText } from "ai";
import { initializeContainer, container } from "@/lib/plugin-loader";
import { createLocalLLMResponse } from "@/lib/local-llm-stream";
import { resizeBase64Image } from "@/lib/image-resize";
import { resolveFileUrl } from "@/lib/file-storage";
import type { ChatAttachment } from "@/lib/chat-store";
import type { ResolvedCredentials } from "@/lib/types";
import type { LanguageModel } from "ai";

// Initialize DI container on first import
initializeContainer();

export const maxDuration = 120;

const DEFAULT_SYSTEM_PROMPT = `Ты — полезный AI-ассистент в семейном хабе. Отвечай на русском языке, если пользователь пишет на русском. Будь дружелюбным и полезным.`;

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
      temperature: rawTemperature,
      reasoningEnabled: rawReasoningEnabled,
      chatId,
      assistantMessageId,
    } = body as {
      messages: ApiMessage[];
      model: string;
      provider: string;
      systemPrompt?: string;
      temperature?: number;
      reasoningEnabled?: boolean;
      chatId?: string;
      assistantMessageId?: string;
    };

    if (!messages || !modelId || !provider) {
      return new Response(
        JSON.stringify({ error: "Отсутствуют обязательные поля запроса" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Model access is a plugin concern; the OSS policy grants everything.
    const userRole = req.headers.get("x-user-role") || "user";
    const requestUserId = req.headers.get("x-user-id") || "unknown";
    if (!container.get("modelAccessPolicy").canUse(requestUserId, modelId)) {
      return new Response(
        JSON.stringify({ error: "Модель недоступна" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
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

        // Skip user messages with no usable content — Vertex/Gemini rejects
        // requests containing a message with empty `parts`.
        if (contentParts.length === 0) {
          continue;
        }

        coreMessages.push({ role: "user", content: contentParts });
      } else if (msg.role === "assistant") {
        // Skip empty assistant messages (interrupted/failed generations).
        // An empty `parts` array breaks Vertex/Gemini on the next request.
        if (!msg.content || !msg.content.trim()) {
          continue;
        }
        coreMessages.push({ role: "assistant", content: msg.content });
      }
    }

    // Guard against a request with no valid messages at all.
    if (coreMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Нет сообщений для отправки" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let result;

    const userMessageId = messages.findLast((m) => m.role === "user")?.id;
    const userId = req.headers.get("x-user-id") || "unknown";

    const credentials: ResolvedCredentials =
      container.get("providerResolver").resolve(modelId, provider, userRole)!;

    if (credentials.baseProvider === "local") {
      // Local provider: fetch directly from llama.cpp (no AI SDK provider needed).
      const reasoningEnabled = rawReasoningEnabled !== false;
      const temperature = typeof rawTemperature === "number"
        ? rawTemperature
        : reasoningEnabled ? 0.6 : 0.7;

      return createLocalLLMResponse({
        modelId,
        system,
        messages: coreMessages,
        temperature,
        reasoningEnabled,
        maxOutputTokens: 16384,
        abortSignal: req.signal,
        ...(credentials.baseURL ? { baseURL: credentials.baseURL } : {}),
        onFinish(usage) {
          container.get("usageTracker")
            .onChatFinish({ userId, modelId, usage, chatId, userMessageId, assistantMessageId })
            .catch((err) => console.error("[usage-tracker] local chat finish error:", err));
        },
      });
    }

    const model = container.get("modelFactory").create(credentials, modelId) as LanguageModel | null;
    if (!model) {
      return new Response(
        JSON.stringify({ error: `Не удалось создать провайдер: ${provider}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    result = streamText({
      model,
      system,
      messages: coreMessages,
      abortSignal: req.signal,
      ...(typeof rawTemperature === "number" ? { temperature: rawTemperature } : {}),
      onFinish({ usage }) {
        if (usage) {
          container.get("usageTracker").onChatFinish({
            userId,
            modelId,
            usage: {
              promptTokens: usage.inputTokens ?? 0,
              completionTokens: usage.outputTokens ?? 0,
              totalTokens: usage.totalTokens ?? 0,
            },
            chatId,
            userMessageId,
            assistantMessageId,
          }).catch((err) => console.error("[usage-tracker] chat finish error:", err));
        }
      },
    });

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
