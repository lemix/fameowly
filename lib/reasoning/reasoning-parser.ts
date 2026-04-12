/**
 * Universal streaming tag parser for reasoning blocks.
 * Supports configurable, potentially asymmetric tag pairs.
 *
 * Usage:
 *   const parser = new ReasoningStreamParser([
 *     { openTag: "<think>", closeTag: "</think>" },
 *     { openTag: "<|think|>", closeTag: "</think>" },
 *   ]);
 *   for (const piece of parser.feed(chunk)) { ... }
 */

import type { ReasoningTagPair } from "./reasoning-config";

// ─── Types ───────────────────────────────────────────────────────────

export type ParsedChunk =
  | { type: "reasoning"; content: string }
  | { type: "text"; content: string };

type ParserState = "detect-start" | "in-reasoning" | "in-text";

// ─── Parser ──────────────────────────────────────────────────────────

/**
 * State-machine parser that splits a streaming text into
 * reasoning and text chunks based on configurable tag pairs.
 */
export class ReasoningStreamParser {
  private state: ParserState = "detect-start";
  private buffer = "";
  private activeCloseTag: string | null = null;
  private _reasoningChars = 0;

  constructor(private readonly tagPairs: ReasoningTagPair[]) {}

  get reasoningChars(): number {
    return this._reasoningChars;
  }

  /** Feed a text chunk, get parsed output pieces. */
  feed(chunk: string): ParsedChunk[] {
    this.buffer += chunk;
    const results: ParsedChunk[] = [];

    while (this.buffer.length > 0) {
      switch (this.state) {
        case "detect-start": {
          const match = this.matchAnyOpenTag();
          if (match === "matched") {
            this.state = "in-reasoning";
            continue;
          }
          if (match === "partial") return results; // wait for more data
          // No tag — model skipped reasoning
          this.state = "in-text";
          continue;
        }

        case "in-reasoning": {
          if (!this.activeCloseTag) {
            this.state = "in-text";
            continue;
          }
          const closeIdx = this.buffer.indexOf(this.activeCloseTag);
          if (closeIdx !== -1) {
            const reasoning = this.buffer.slice(0, closeIdx);
            if (reasoning) {
              results.push({ type: "reasoning", content: reasoning });
              this._reasoningChars += reasoning.length;
            }
            this.buffer = this.buffer.slice(closeIdx + this.activeCloseTag.length);
            this.activeCloseTag = null;
            this.state = "in-text";
            continue;
          }
          // Check for partial close tag at the end of buffer
          const partialLen = findPartialSuffix(this.buffer, this.activeCloseTag);
          if (partialLen > 0) {
            const safe = this.buffer.slice(0, -partialLen);
            if (safe) {
              results.push({ type: "reasoning", content: safe });
              this._reasoningChars += safe.length;
            }
            this.buffer = this.buffer.slice(this.buffer.length - partialLen);
            return results;
          }
          // No close tag yet — emit all as reasoning
          results.push({ type: "reasoning", content: this.buffer });
          this._reasoningChars += this.buffer.length;
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
    const type = this.state === "in-reasoning" ? "reasoning" : "text";
    if (type === "reasoning") this._reasoningChars += this.buffer.length;
    const result: ParsedChunk[] = [{ type, content: this.buffer }];
    this.buffer = "";
    return result;
  }

  isInReasoning(): boolean {
    return this.state === "in-reasoning";
  }

  /**
   * Try to match any configured open tag at the start of buffer.
   * On match, advances the buffer past the tag and records the close tag.
   */
  private matchAnyOpenTag(): "matched" | "partial" | "none" {
    let hasPartial = false;

    for (const pair of this.tagPairs) {
      if (this.buffer.startsWith(pair.openTag)) {
        this.buffer = this.buffer.slice(pair.openTag.length);
        this.activeCloseTag = pair.closeTag;
        return "matched";
      }
      // Buffer could still become this open tag with more data
      if (
        pair.openTag.startsWith(this.buffer) &&
        this.buffer.length < pair.openTag.length
      ) {
        hasPartial = true;
      }
    }
    return hasPartial ? "partial" : "none";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Check if `str` ends with a prefix of `tag`. Returns partial match length. */
function findPartialSuffix(str: string, tag: string): number {
  for (let len = Math.min(tag.length - 1, str.length); len >= 1; len--) {
    if (str.endsWith(tag.slice(0, len))) return len;
  }
  return 0;
}
