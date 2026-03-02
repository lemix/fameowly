import { streamText, convertToModelMessages, UIMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { proxyFetch } from "@/lib/proxy-fetch";

export const maxDuration = 120;

const DEFAULT_SYSTEM_PROMPT = `Ты — полезный AI-ассистент в семейном хабе. Отвечай на русском языке, если пользователь пишет на русском. Будь дружелюбным и полезным.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages,
      model: modelId,
      provider,
      systemPrompt,
    } = body as {
      messages: UIMessage[];
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

    // Convert UIMessage[] to ModelMessage[] for the AI SDK
    const modelMessages = await convertToModelMessages(messages);

    let result;

    if (provider === "google") {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        fetch: proxyFetch,
      });
      result = streamText({
        model: google(modelId),
        system,
        messages: modelMessages,
      });
    } else if (provider === "openrouter") {
      const openrouter = createOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        fetch: proxyFetch,
      });
      result = streamText({
        model: openrouter(modelId),
        system,
        messages: modelMessages,
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
