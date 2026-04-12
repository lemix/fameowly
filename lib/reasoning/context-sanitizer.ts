/**
 * Context sanitizer — strips reasoning blocks from assistant messages
 * before sending them to the LLM, saving context window space
 * and preventing the model from being confused by old reasoning.
 */

import { getAllKnownTags } from "./reasoning-config";

// ─── Precomputed regex patterns for all known tag formats ────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface TagRegexEntry {
  /** Matches a complete reasoning block: openTag...closeTag */
  blockRegex: RegExp;
  /** Matches orphaned open tags (from interrupted reasoning) */
  openTagRegex: RegExp;
}

const TAG_PATTERNS: TagRegexEntry[] = getAllKnownTags().map((pair) => {
  const open = escapeRegex(pair.openTag);
  const close = escapeRegex(pair.closeTag);
  return {
    blockRegex: new RegExp(`${open}[\\s\\S]*?${close}`, "g"),
    openTagRegex: new RegExp(open, "g"),
  };
});

// ─── Public API ──────────────────────────────────────────────────────

/** Strip all known reasoning tag blocks from a text string. */
export function stripReasoningFromText(text: string): string {
  let result = text;
  for (const { blockRegex, openTagRegex } of TAG_PATTERNS) {
    // Remove complete blocks: openTag...closeTag
    result = result.replace(blockRegex, "");
    // Remove orphaned open tags left from interrupted reasoning
    result = result.replace(openTagRegex, "");
  }
  return result.trim();
}

/**
 * Sanitize a messages array for the LLM: strip reasoning content
 * from all assistant messages. User messages are passed through unchanged.
 */
export function sanitizeMessagesForLLM<
  T extends { role: string; content: string },
>(messages: T[]): T[] {
  return messages.map((msg) => {
    if (msg.role !== "assistant" || !msg.content) return msg;
    const cleaned = stripReasoningFromText(msg.content);
    return cleaned !== msg.content ? { ...msg, content: cleaned } : msg;
  });
}
