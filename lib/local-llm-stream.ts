/**
 * Local LLM stream handler — intercepts <think> tags from ik_llama.cpp,
 * emits AI SDK UI Message Stream protocol (reasoning-delta / text-delta),
 * enforces reasoning token limit with auto-retry.
 */

import { streamText } from "ai";
import type { LanguageModel, ModelMessage } from "ai";

// ─── Constants ───────────────────────────────────────────────────────

const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";
const CHARS_PER_TOKEN = 2; // conservative for mixed Ru/En (tokenizers split Cyrillic more)
const MAX_REASONING_TIME_MS = 60_000; // 60s wall-clock limit for reasoning phase
const MAX_PREFILL_CHARS = 3000; // max reasoning chars to include in retry prefill

// ─── SSE helpers ─────────────────────────────────────────────────────

const UI_MESSAGE_STREAM_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache",
  connection: "keep-alive",
  "x-vercel-ai-ui-message-stream": "v1",
  "x-accel-buffering": "no",
} as const;

function sseEvent(obj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

// ─── Think-tag parser (state machine) ────────────────────────────────

type ParserState = "detect-start" | "in-reasoning" | "in-text";

interface ParsedChunk {
  type: "reasoning" | "text";
  content: string;
}

class ThinkTagParser {
  private state: ParserState = "detect-start";
  private buffer = "";
  private _reasoningTokens = 0;

  get reasoningTokens(): number {
    return this._reasoningTokens;
  }

  /** Feed a chunk, get parsed output pieces. */
  feed(chunk: string): ParsedChunk[] {
    this.buffer += chunk;
    const results: ParsedChunk[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.buffer.length === 0) break;

      switch (this.state) {
        case "detect-start": {
          // Check if buffer starts with <think>
          if (this.buffer.startsWith(THINK_OPEN)) {
            this.buffer = this.buffer.slice(THINK_OPEN.length);
            this.state = "in-reasoning";
            continue;
          }
          // Could still become <think> with more data
          if (THINK_OPEN.startsWith(this.buffer) && this.buffer.length < THINK_OPEN.length) {
            return results;
          }
          // Not <think> — model skipped reasoning, emit as text
          this.state = "in-text";
          continue;
        }

        case "in-reasoning": {
          const closeIdx = this.buffer.indexOf(THINK_CLOSE);
          if (closeIdx !== -1) {
            const reasoning = this.buffer.slice(0, closeIdx);
            if (reasoning) {
              results.push({ type: "reasoning", content: reasoning });
              this._reasoningTokens += Math.ceil(reasoning.length / CHARS_PER_TOKEN);
            }
            this.buffer = this.buffer.slice(closeIdx + THINK_CLOSE.length);
            this.state = "in-text";
            continue;
          }
          // Check for partial </think> at end of buffer
          const partialLen = findPartialSuffix(this.buffer, THINK_CLOSE);
          if (partialLen > 0) {
            const safe = this.buffer.slice(0, this.buffer.length - partialLen);
            if (safe) {
              results.push({ type: "reasoning", content: safe });
              this._reasoningTokens += Math.ceil(safe.length / CHARS_PER_TOKEN);
            }
            this.buffer = this.buffer.slice(this.buffer.length - partialLen);
            return results;
          }
          // No closing tag yet — emit all as reasoning
          results.push({ type: "reasoning", content: this.buffer });
          this._reasoningTokens += Math.ceil(this.buffer.length / CHARS_PER_TOKEN);
          this.buffer = "";
          return results;
        }

        case "in-text": {
          results.push({ type: "text", content: this.buffer });
          this.buffer = "";
          return results;
        }
      }
    }

    return results;
  }

  /** Flush remaining buffer on stream end. */
  flush(): ParsedChunk[] {
    if (!this.buffer) return [];
    if (this.state === "in-reasoning") {
      const result: ParsedChunk[] = [{ type: "reasoning", content: this.buffer }];
      this._reasoningTokens += Math.ceil(this.buffer.length / CHARS_PER_TOKEN);
      this.buffer = "";
      return result;
    }
    const result: ParsedChunk[] = [{ type: "text", content: this.buffer }];
    this.buffer = "";
    return result;
  }

  isInReasoning(): boolean {
    return this.state === "in-reasoning";
  }
}

/** Check if `str` ends with a prefix of `tag`. Returns length of partial match. */
function findPartialSuffix(str: string, tag: string): number {
  for (let len = Math.min(tag.length - 1, str.length); len >= 1; len--) {
    if (str.endsWith(tag.slice(0, len))) {
      return len;
    }
  }
  return 0;
}

// ─── (ModelMessage is imported from AI SDK) ─────────────────────────

// ─── Main stream builder ─────────────────────────────────────────────

export interface LocalStreamParams {
  model: LanguageModel;
  system: string;
  messages: ModelMessage[];
  temperature: number;
  reasoningEnabled: boolean;
  maxReasoningTokens: number;
  maxOutputTokens: number;
  abortSignal: AbortSignal;
}

/**
 * Build a fully-formed SSE Response for the local LLM provider.
 * Handles <think> tag parsing, reasoning limit (tokens + wall-clock),
 * and abort-retry with assistant prefill.
 */
export function createLocalLLMResponse(params: LocalStreamParams): Response {
  const {
    model,
    system,
    messages,
    temperature,
    reasoningEnabled,
    maxReasoningTokens,
    maxOutputTokens,
    abortSignal,
  } = params;

  const encoder = new TextEncoder();
  let aborted = false;

  abortSignal.addEventListener("abort", () => { aborted = true; }, { once: true });

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (obj: Record<string, unknown>) => {
        if (aborted) return;
        try { controller.enqueue(encoder.encode(sseEvent(obj))); } catch { /* closed */ }
      };

      const reasoningPartId = "reasoning-0";
      const textPartId = "text-0";
      let reasoningStarted = false;
      let reasoningEnded = false;
      let textStarted = false;

      try {
        enqueue({ type: "start" });
        enqueue({ type: "start-step" });

        // ── Phase 1: Initial stream ──────────────────────────────
        const effectiveMessages: ModelMessage[] = reasoningEnabled
          ? messages
          : [...messages, { role: "assistant" as const, content: "</think>\n" }];

        const localAbort = new AbortController();
        const unlinkLocal = linkAbort(abortSignal, localAbort);

        const result = streamText({
          model,
          system,
          messages: effectiveMessages,
          temperature,
          maxOutputTokens,
          abortSignal: localAbort.signal,
        });

        const parser = new ThinkTagParser();
        let accumulatedReasoning = "";
        let needsRetry = false;
        const reasoningStartTime = Date.now();

        try {
          for await (const chunk of result.textStream) {
            if (aborted) break;

            const pieces = parser.feed(chunk);
            for (const piece of pieces) {
              if (aborted) break;

              if (piece.type === "reasoning") {
                accumulatedReasoning += piece.content;

                const tokenLimitHit = parser.reasoningTokens > maxReasoningTokens;
                const elapsed = Date.now() - reasoningStartTime;
                const timeLimitHit = elapsed > MAX_REASONING_TIME_MS;

                if (tokenLimitHit || timeLimitHit) {
                  needsRetry = true;
                  const reason = tokenLimitHit
                    ? `лимит токенов (~${parser.reasoningTokens})`
                    : `лимит времени (${Math.round(elapsed / 1000)}с)`;
                  console.log(`[local-llm] Reasoning interrupted: ${reason}`);
                  if (!reasoningStarted) {
                    enqueue({ type: "reasoning-start", id: reasoningPartId });
                    reasoningStarted = true;
                  }
                  enqueue({
                    type: "reasoning-delta",
                    id: reasoningPartId,
                    delta: `\n\n[⚠ Рассуждение прервано: ${reason}]`,
                  });
                  break;
                }

                if (!reasoningStarted) {
                  enqueue({ type: "reasoning-start", id: reasoningPartId });
                  reasoningStarted = true;
                }
                enqueue({ type: "reasoning-delta", id: reasoningPartId, delta: piece.content });
              } else {
                // Text — model finished reasoning normally
                if (reasoningStarted && !reasoningEnded) {
                  enqueue({ type: "reasoning-end", id: reasoningPartId });
                  reasoningEnded = true;
                }
                if (!textStarted) {
                  enqueue({ type: "text-start", id: textPartId });
                  textStarted = true;
                }
                enqueue({ type: "text-delta", id: textPartId, delta: piece.content });
              }
            }

            if (needsRetry) break;

            // Between-chunk time check (slow generation)
            if (
              parser.isInReasoning() &&
              !needsRetry &&
              Date.now() - reasoningStartTime > MAX_REASONING_TIME_MS
            ) {
              needsRetry = true;
              console.log(
                `[local-llm] Reasoning timeout: ${Math.round((Date.now() - reasoningStartTime) / 1000)}s`
              );
              if (!reasoningStarted) {
                enqueue({ type: "reasoning-start", id: reasoningPartId });
                reasoningStarted = true;
              }
              enqueue({
                type: "reasoning-delta",
                id: reasoningPartId,
                delta: `\n\n[⚠ Рассуждение прервано: лимит времени]`,
              });
              break;
            }
          }
        } catch (streamErr) {
          // Stream error (ctx_shift crash, connection drop, etc.)
          if (!aborted && !needsRetry && parser.isInReasoning()) {
            needsRetry = true;
            console.error("[local-llm] Stream error during reasoning, will retry:", streamErr);
            if (!reasoningStarted) {
              enqueue({ type: "reasoning-start", id: reasoningPartId });
              reasoningStarted = true;
            }
            enqueue({
              type: "reasoning-delta",
              id: reasoningPartId,
              delta: "\n\n[⚠ Рассуждение прервано: ошибка потока]",
            });
          } else if (!aborted) {
            throw streamErr;
          }
        } finally {
          // Flush remaining parser buffer into accumulatedReasoning
          if (needsRetry) {
            for (const p of parser.flush()) {
              if (p.type === "reasoning") accumulatedReasoning += p.content;
            }
          }
          unlinkLocal();
          localAbort.abort();
        }

        // ── Phase 2: Retry with assistant prefill ────────────────
        if (needsRetry && !aborted) {
          if (reasoningStarted && !reasoningEnded) {
            enqueue({ type: "reasoning-end", id: reasoningPartId });
            reasoningEnded = true;
          }

          console.log(
            `[local-llm] Retry: reasoning ${accumulatedReasoning.length} chars, ` +
            `prefill ${Math.min(accumulatedReasoning.length, MAX_PREFILL_CHARS)} chars`
          );

          // Build assistant prefill — include truncated reasoning so the
          // model can produce an answer informed by its earlier reasoning.
          const trimmed = accumulatedReasoning.length > MAX_PREFILL_CHARS
            ? accumulatedReasoning.slice(-MAX_PREFILL_CHARS)
            : accumulatedReasoning;
          const prefill = trimmed.trim()
            ? `<think>\n${trimmed.trim()}\n</think>\n`
            : "</think>\n";

          const retryAbort = new AbortController();
          const unlinkRetry = linkAbort(abortSignal, retryAbort);

          try {
            const retryMessages: ModelMessage[] = [
              ...messages,
              { role: "assistant" as const, content: prefill },
            ];

            const retryResult = streamText({
              model,
              system,
              messages: retryMessages,
              temperature,
              maxOutputTokens: Math.min(maxOutputTokens, 4096),
              abortSignal: retryAbort.signal,
            });

            if (!textStarted) {
              enqueue({ type: "text-start", id: textPartId });
              textStarted = true;
            }

            for await (const chunk of retryResult.textStream) {
              if (aborted) break;
              enqueue({ type: "text-delta", id: textPartId, delta: chunk });
            }
          } catch (retryErr) {
            if (!aborted) {
              console.error("[local-llm] Retry also failed:", retryErr);
              if (!textStarted) {
                enqueue({ type: "text-start", id: textPartId });
                textStarted = true;
              }
              enqueue({
                type: "text-delta",
                id: textPartId,
                delta: "\n\n[Не удалось получить ответ. Попробуйте упростить запрос или уменьшить историю чата.]",
              });
            }
          } finally {
            unlinkRetry();
            retryAbort.abort();
          }
        } else if (!needsRetry) {
          // Normal finish — flush parser
          const remaining = parser.flush();
          for (const piece of remaining) {
            if (aborted) break;
            if (piece.type === "reasoning") {
              if (!reasoningStarted) {
                enqueue({ type: "reasoning-start", id: reasoningPartId });
                reasoningStarted = true;
              }
              enqueue({ type: "reasoning-delta", id: reasoningPartId, delta: piece.content });
            } else {
              if (reasoningStarted && !reasoningEnded) {
                enqueue({ type: "reasoning-end", id: reasoningPartId });
                reasoningEnded = true;
              }
              if (!textStarted) {
                enqueue({ type: "text-start", id: textPartId });
                textStarted = true;
              }
              enqueue({ type: "text-delta", id: textPartId, delta: piece.content });
            }
          }
        }

        // ── Finalize SSE stream ──────────────────────────────────
        if (reasoningStarted && !reasoningEnded) {
          enqueue({ type: "reasoning-end", id: reasoningPartId });
        }
        if (textStarted) {
          enqueue({ type: "text-end", id: textPartId });
        }

        enqueue({ type: "finish-step" });
        enqueue({ type: "finish", finishReason: "stop" });
      } catch (err: unknown) {
        if (!aborted) {
          const msg = err instanceof Error ? err.message : "Local LLM error";
          console.error("[local-llm] Fatal error:", msg);
          enqueue({ type: "error", errorText: msg });
        }
      } finally {
        if (!aborted) {
          try { controller.enqueue(encoder.encode("data: [DONE]\n\n")); } catch { /* closed */ }
        }
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(readable, {
    headers: UI_MESSAGE_STREAM_HEADERS,
  });
}

/** Link an external AbortSignal to a local AbortController; returns cleanup fn */
function linkAbort(external: AbortSignal, local: AbortController): () => void {
  const handler = () => local.abort();
  external.addEventListener("abort", handler, { once: true });
  return () => external.removeEventListener("abort", handler);
}
