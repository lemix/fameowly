/**
 * Local LLM stream handler — fetches directly from llama.cpp
 * OpenAI-compatible API, uses native reasoning_content when available,
 * falls back to configurable tag parsing, and handles timeout safely.
 *
 * Emits AI SDK UI Message Stream protocol (reasoning-delta / text-delta).
 */

import { getLocalLLMBaseURL } from "./local-llm-config";
import { getReasoningTags } from "./reasoning/reasoning-config";
import { ReasoningStreamParser } from "./reasoning/reasoning-parser";
import { sanitizeMessagesForLLM } from "./reasoning/context-sanitizer";

// ─── Constants ───────────────────────────────────────────────────────

/** Wall-clock timeout for the entire request (reasoning + text generation) */
const MAX_REQUEST_TIME_MS = 600000; // 10 minutes

const UI_STREAM_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache",
  connection: "keep-alive",
  "x-vercel-ai-ui-message-stream": "v1",
  "x-accel-buffering": "no",
} as const;

// ─── Types ───────────────────────────────────────────────────────────

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; mimeType?: string }
  | { type: "file"; data: string; mediaType: string };

type CoreMessage =
  | { role: "user"; content: ContentPart[] }
  | { role: "assistant"; content: string };

export interface LocalStreamParams {
  modelId: string;
  system: string;
  messages: CoreMessage[];
  temperature: number;
  reasoningEnabled: boolean;
  maxOutputTokens: number;
  abortSignal: AbortSignal;
  /** Override base URL (from virtual provider rotation) */
  baseURL?: string;
  /** Called after stream completes with usage stats (if available) */
  onFinish?: (usage: { promptTokens: number; completionTokens: number; totalTokens: number }) => void;
}

// ─── Message format conversion ───────────────────────────────────────

/** Convert AI SDK CoreMessages to OpenAI Chat Completions format */
function toOpenAIMessages(
  system: string,
  messages: CoreMessage[],
): Array<{ role: string; content: string | Array<Record<string, unknown>> }> {
  const result: Array<{ role: string; content: string | Array<Record<string, unknown>> }> = [
    { role: "system", content: system },
  ];

  for (const msg of messages) {
    if (msg.role === "assistant") {
      result.push({ role: "assistant", content: msg.content });
    } else {
      const parts: Array<Record<string, unknown>> = [];
      for (const part of msg.content) {
        if (part.type === "text") {
          parts.push({ type: "text", text: part.text });
        } else if (part.type === "image") {
          const mime = part.mimeType || "image/png";
          parts.push({
            type: "image_url",
            image_url: { url: `data:${mime};base64,${part.image}` },
          });
        }
        // file parts skipped — llama.cpp doesn't support them natively
      }
      if (parts.length === 1 && parts[0].type === "text") {
        result.push({ role: "user", content: parts[0].text as string });
      } else {
        result.push({ role: "user", content: parts });
      }
    }
  }

  return sanitizeMessagesForLLM(
    result as Array<{ role: string; content: string }>,
  );
}

// ─── SSE helpers ─────────────────────────────────────────────────────

function sseEvent(obj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

interface ChatDelta {
  content?: string | null;
  reasoning_content?: string | null;
}

/** Captured usage from the final SSE chunk */
interface StreamUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ParsedStream {
  deltas: AsyncGenerator<ChatDelta>;
  /** Call after iteration completes to get captured usage */
  getUsage: () => StreamUsage | null;
}

/** Parse llama.cpp Chat Completions SSE stream into delta objects */
function parseChatStream(response: Response): ParsedStream {
  let capturedUsage: StreamUsage | null = null;

  async function* iterate(): AsyncGenerator<ChatDelta> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            // Capture usage from the chunk (llama.cpp sends it in the final chunk)
            if (parsed.usage) {
              capturedUsage = parsed.usage as StreamUsage;
            }
            const delta: ChatDelta = parsed.choices?.[0]?.delta;
            if (delta) yield delta;
          } catch { /* skip malformed JSON */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  return {
    deltas: iterate(),
    getUsage: () => capturedUsage,
  };
}

// ─── Main stream builder ─────────────────────────────────────────────

/**
 * Build a fully-formed SSE Response for the local LLM provider.
 * Fetches directly from llama.cpp to access reasoning_content natively.
 */
export function createLocalLLMResponse(params: LocalStreamParams): Response {
  const { modelId, system, messages, temperature, reasoningEnabled, maxOutputTokens, abortSignal, onFinish } = params;
  const encoder = new TextEncoder();
  let aborted = false;
  abortSignal.addEventListener("abort", () => { aborted = true; }, { once: true });

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: Record<string, unknown>) => {
        if (aborted) return;
        try { controller.enqueue(encoder.encode(sseEvent(obj))); } catch { /* closed */ }
      };

      const R = "reasoning-0";
      const T = "text-0";
      let rStarted = false, rEnded = false, tStarted = false;
      let timedOut = false;

      try {
        emit({ type: "start" });
        emit({ type: "start-step" });

        const baseURL = params.baseURL || getLocalLLMBaseURL(modelId);
        const openaiMsgs = toOpenAIMessages(system, messages);

        const localAbort = new AbortController();
        const unlinkLocal = linkAbort(abortSignal, localAbort);
        const timer = setTimeout(() => localAbort.abort(), MAX_REQUEST_TIME_MS);

        let response: Response;
        try {
          const body: Record<string, unknown> = {
            model: modelId,
            messages: openaiMsgs,
            stream: true,
            temperature,
            max_tokens: maxOutputTokens,
          };
          // Disable thinking at the Jinja template level for llama.cpp
          if (!reasoningEnabled) {
            body.chat_template_kwargs = { enable_thinking: false };
          }
          response = await fetch(`${baseURL}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: localAbort.signal,
          });
        } catch (err) {
          if (aborted) { finalize(controller, encoder); return; }
          throw err;
        }

        if (!response.ok) {
          const errText = await response.text().catch(() => "Unknown error");
          throw new Error(`llama.cpp ${response.status}: ${errText}`);
        }

        // Stream processing — dual mode: native reasoning_content OR tag fallback
        let usedNative = false;
        let fallback: ReasoningStreamParser | null = null;
        const stream = parseChatStream(response);

        try {
          for await (const delta of stream.deltas) {
            if (aborted) break;

            // 1) Native reasoning_content from llama.cpp server
            if (delta.reasoning_content) {
              usedNative = true;
              if (!rStarted) { emit({ type: "reasoning-start", id: R }); rStarted = true; }
              emit({ type: "reasoning-delta", id: R, delta: delta.reasoning_content });
            }

            // 2) Content text
            if (delta.content) {
              if (!usedNative && !fallback && reasoningEnabled) {
                fallback = new ReasoningStreamParser(getReasoningTags(modelId));
              }

              if (fallback) {
                emitParsed(fallback.feed(delta.content));
              } else {
                if (usedNative && rStarted && !rEnded) { emit({ type: "reasoning-end", id: R }); rEnded = true; }
                if (!tStarted) { emit({ type: "text-start", id: T }); tStarted = true; }
                emit({ type: "text-delta", id: T, delta: delta.content });
              }
            }
          }
        } catch (streamErr) {
          if (localAbort.signal.aborted && !aborted) {
            timedOut = true;
            console.log(`[local-llm] Request timed out after ${MAX_REQUEST_TIME_MS / 1000}s`);
            if (rStarted && !rEnded) {
              emit({ type: "reasoning-delta", id: R, delta: "\n\n[⚠ Рассуждение прервано: превышен лимит времени]" });
            }
          } else if (!aborted) {
            throw streamErr;
          }
        } finally {
          clearTimeout(timer);
          unlinkLocal();
        }

        // Flush fallback parser
        if (fallback) emitParsed(fallback.flush());

        // Handle timeout with no text generated
        if (timedOut && !tStarted) {
          emit({ type: "text-start", id: T }); tStarted = true;
          emit({ type: "text-delta", id: T, delta: "[Превышен лимит времени. Попробуйте упростить запрос или отключить режим размышления.]" });
        }

        if (rStarted && !rEnded) emit({ type: "reasoning-end", id: R });
        if (tStarted) emit({ type: "text-end", id: T });
        emit({ type: "finish-step" });
        emit({ type: "finish", finishReason: timedOut ? "length" : "stop" });

        // Report usage to the callback (if provided and usage available)
        if (onFinish) {
          const usage = stream.getUsage();
          if (usage) {
            onFinish({
              promptTokens: usage.prompt_tokens ?? 0,
              completionTokens: usage.completion_tokens ?? 0,
              totalTokens: usage.total_tokens ?? 0,
            });
          }
        }

        // Inner helper — emit parsed pieces from fallback parser
        function emitParsed(pieces: Array<{ type: "reasoning" | "text"; content: string }>) {
          for (const p of pieces) {
            if (p.type === "reasoning") {
              if (!rStarted) { emit({ type: "reasoning-start", id: R }); rStarted = true; }
              emit({ type: "reasoning-delta", id: R, delta: p.content });
            } else {
              if (rStarted && !rEnded) { emit({ type: "reasoning-end", id: R }); rEnded = true; }
              if (!tStarted) { emit({ type: "text-start", id: T }); tStarted = true; }
              emit({ type: "text-delta", id: T, delta: p.content });
            }
          }
        }
      } catch (err: unknown) {
        if (!aborted) {
          const msg = err instanceof Error ? err.message : "Local LLM error";
          console.error("[local-llm] Fatal:", msg);
          emit({ type: "error", errorText: msg });
        }
      } finally {
        finalize(controller, encoder);
      }
    },
  });

  return new Response(readable, { headers: UI_STREAM_HEADERS });
}

// ─── Shared utilities ────────────────────────────────────────────────

function finalize(controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  try { controller.enqueue(encoder.encode("data: [DONE]\n\n")); } catch { /* closed */ }
  try { controller.close(); } catch { /* already closed */ }
}

function linkAbort(external: AbortSignal, local: AbortController): () => void {
  const handler = () => local.abort();
  external.addEventListener("abort", handler, { once: true });
  return () => external.removeEventListener("abort", handler);
}
