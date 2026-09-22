import { streamText } from "ai";
import { initializeContainer, container } from "@/lib/plugin-loader";
import { createLocalLLMResponse } from "@/lib/local-llm-stream";
import { buildCoreMessages } from "@/lib/chat/build-core-messages";
import { containsPublicUrl } from "@/lib/web-tools/url-detection";
import { extractGrounding, countSearchQueries } from "@/lib/web-tools/grounding";
import type { ApiMessage } from "@/lib/chat/build-core-messages";
import type { ResolvedCredentials } from "@/lib/types";
import type { LanguageModel, ToolSet } from "ai";

// Initialize DI container on first import
initializeContainer();

export const maxDuration = 120;

const DEFAULT_SYSTEM_PROMPT = `Ты — полезный AI-ассистент в семейном хабе. Отвечай на русском языке, если пользователь пишет на русском. Будь дружелюбным и полезным.`;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
      webSearchEnabled: rawWebSearchEnabled,
      chatId,
      assistantMessageId,
    } = body as {
      messages: ApiMessage[];
      model: string;
      provider: string;
      systemPrompt?: string;
      temperature?: number;
      reasoningEnabled?: boolean;
      webSearchEnabled?: boolean;
      chatId?: string;
      assistantMessageId?: string;
    };

    if (!messages || !modelId || !provider) {
      return jsonError("Отсутствуют обязательные поля запроса", 400);
    }

    // Model access is a plugin concern; the OSS policy grants everything.
    const userRole = req.headers.get("x-user-role") || "user";
    const userId = req.headers.get("x-user-id") || "unknown";
    if (!container.get("modelAccessPolicy").canUse(userId, modelId)) {
      return jsonError("Модель недоступна", 403);
    }

    const system = systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const coreMessages = await buildCoreMessages(messages);
    if (coreMessages.length === 0) {
      return jsonError("Нет сообщений для отправки", 400);
    }

    const lastUserMessage = messages.findLast((m) => m.role === "user");
    const userMessageId = lastUserMessage?.id;

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
      return jsonError(`Не удалось создать провайдер: ${provider}`, 400);
    }

    // URL Context is gated on the *current* message only — attaching it for old
    // links would re-fetch those pages and bill their content as input tokens.
    const tools = container.get("webToolsProvider").resolve({
      baseProvider: credentials.baseProvider,
      webSearchEnabled: rawWebSearchEnabled !== false,
      urlContextRequested: containsPublicUrl(lastUserMessage?.content ?? ""),
    }) as ToolSet | undefined;

    const result = streamText({
      model,
      system,
      messages: coreMessages,
      abortSignal: req.signal,
      ...(typeof rawTemperature === "number" ? { temperature: rawTemperature } : {}),
      ...(tools ? { tools } : {}),
      onFinish({ usage, steps }) {
        if (!usage) return;
        const webSearchQueries = steps.reduce(
          (sum, step) => sum + countSearchQueries(step.providerMetadata),
          0,
        );
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
          webSearchQueries,
        }).catch((err) => console.error("[usage-tracker] chat finish error:", err));
      },
    });

    return result.toUIMessageStreamResponse({
      // Grounding travels on a side channel — never inside message content.
      messageMetadata({ part }) {
        if (part.type !== "finish-step") return undefined;
        const grounding = extractGrounding(part.providerMetadata);
        return grounding ? { grounding } : undefined;
      },
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message =
      error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    return jsonError(message, 500);
  }
}

/** Save completed messages after streaming finishes (called from client) */
export async function PATCH() {
  // This endpoint is reserved for future server-side message persistence hooks.
  // Currently persistence is handled via /api/chats PATCH.
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
