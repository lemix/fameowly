import { streamText, stepCountIs } from "ai";
import { initializeContainer, container } from "@/lib/plugin-loader";
import { buildCoreMessages } from "@/lib/chat/build-core-messages";
import { applyWebContext } from "@/lib/chat/apply-web-context";
import { createGroundingTracker, countStepSearchQueries } from "@/lib/chat/stream-grounding";
import { extractPublicUrls } from "@/lib/web-tools/url-detection";
import { isArchivedModel } from "@/lib/models.server";
import type { ApiMessage } from "@/lib/chat/build-core-messages";
import type { ResolvedCredentials } from "@/lib/types";
import type { LanguageModel, ToolSet } from "ai";

// Initialize DI container on first import
initializeContainer();

export const maxDuration = 120;

/** Wall-clock cap for a single generation (local reasoning models are slow). */
const GENERATION_TIMEOUT_MS = 600_000;

const TIMEOUT_NOTICE =
  "[Превышен лимит времени. Попробуйте упростить запрос или отключить режим размышления.]";

const DEFAULT_SYSTEM_PROMPT = `Ты — полезный AI-ассистент в семейном хабе. Отвечай на русском языке, если пользователь пишет на русском. Будь дружелюбным и полезным.`;

// Without it a model stripped of tools tends to write a fake tool call as plain text.
const FINAL_STEP_NOTE =
  "Инструменты больше недоступны. Не пытайся их вызывать. Сразу ответь пользователю обычным текстом по уже полученным данным; если их не хватает — так и скажи.";


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
    if (isArchivedModel(modelId) || !container.get("modelAccessPolicy").canUse(userId, modelId)) {
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

    const model = container.get("modelFactory").create(credentials, modelId) as LanguageModel | null;
    if (!model) {
      return jsonError(`Не удалось создать провайдер: ${provider}`, 400);
    }

    // URL Context is gated on the *current* message only — attaching it for old
    // links would re-fetch those pages and bill their content as input tokens.
    const userText = lastUserMessage?.content ?? "";
    const urls = extractPublicUrls(userText);
    const webRequest = {
      baseProvider: credentials.baseProvider,
      modelId,
      webSearchEnabled: rawWebSearchEnabled !== false,
      urlContextRequested: urls.length > 0,
    };
    const webTools = container.get("webToolsProvider");
    const tools = webTools.resolve(webRequest) as ToolSet | undefined;
    const maxSteps = tools ? webTools.maxSteps?.(webRequest) ?? 1 : 1;
    const webContext = await webTools.prepareContext?.({
      ...webRequest,
      modelId,
      userMessage: userText,
      urls,
      abortSignal: req.signal,
    });
    const prompt = applyWebContext(system, coreMessages, webContext);

    const providerOptions = container.get("reasoningOptionsProvider").resolve({
      baseProvider: credentials.baseProvider,
      modelId,
      reasoningEnabled: rawReasoningEnabled,
    }) as Parameters<typeof streamText>[0]["providerOptions"];

    const trackGrounding = createGroundingTracker(webContext?.grounding);

    const result = streamText({
      model,
      system: prompt.system,
      messages: prompt.messages,
      abortSignal: req.signal,
      timeout: GENERATION_TIMEOUT_MS,
      ...(typeof rawTemperature === "number" ? { temperature: rawTemperature } : {}),
      ...(tools ? { tools } : {}),
      ...(maxSteps > 1
        ? {
            stopWhen: stepCountIs(maxSteps),
            // The last step must answer: a model that still wants to search would end with no text.
            prepareStep: ({ stepNumber }) =>
              stepNumber === maxSteps - 1
                ? { activeTools: [], system: `${prompt.system}\n\n${FINAL_STEP_NOTE}` }
                : undefined,
          }
        : {}),
      ...(providerOptions ? { providerOptions } : {}),
      onFinish({ usage, steps }) {
        if (!usage) return;
        const webSearchQueries = steps.reduce((sum, step) => sum + countStepSearchQueries(step), 0);
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
        const grounding = trackGrounding(part);
        return grounding ? { grounding } : undefined;
      },
      onError(error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/timeout|timed out|aborted/i.test(message)) return TIMEOUT_NOTICE;
        console.error("[chat] stream error:", message);
        return message;
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
