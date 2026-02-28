import { streamText, convertToModelMessages, UIMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

export const maxDuration = 120;

const SYSTEM_PROMPT = `Ты — полезный AI-ассистент в семейном хабе. Отвечай на русском языке, если пользователь пишет на русском. Будь дружелюбным и полезным.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model: modelId, provider } = body as {
      messages: UIMessage[];
      model: string;
      provider: string;
    };

    if (!messages || !modelId || !provider) {
      return new Response(
        JSON.stringify({ error: "Отсутствуют обязательные поля запроса" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert UIMessage[] to ModelMessage[] for the AI SDK
    const modelMessages = await convertToModelMessages(messages);

    let result;

    if (provider === "google") {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      result = streamText({
        model: google(modelId),
        system: SYSTEM_PROMPT,
        messages: modelMessages,
      });
    } else if (provider === "openrouter") {
      const openrouter = createOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });
      result = streamText({
        model: openrouter(modelId),
        system: SYSTEM_PROMPT,
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
