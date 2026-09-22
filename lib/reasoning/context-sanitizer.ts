/**
 * Context sanitizer — strips reasoning blocks and neutralizes URLs in assistant
 * messages before sending them to the LLM. Saves context window space, keeps the
 * model from re-reading its own old links, and avoids re-fetching expired
 * grounding redirect URLs (which would be billed as fresh input tokens).
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
 * Sanitize a messages array for the LLM: strip reasoning content and
 * neutralize URLs in all assistant messages.
 * User messages are passed through unchanged — a link the user just pasted
 * is exactly what the URL Context tool is supposed to read.
 */
export function sanitizeMessagesForLLM<
  T extends { role: string; content: string },
>(messages: T[]): T[] {
  return messages.map((msg) => {
    if (msg.role !== "assistant" || !msg.content) return msg;
    const cleaned = neutralizeUrlsInText(stripReasoningFromText(msg.content));
    return cleaned !== msg.content ? { ...msg, content: cleaned } : msg;
  });
}

// ─── URL neutralization ──────────────────────────────────────────────

const MARKDOWN_LINK = /\[([^\]]*)\]\(\s*(https?:\/\/[^\s)]+)\s*\)/gi;
const BARE_URL = /https?:\/\/[^\s<>"'`)\]}]+/gi;

function sourceLabel(url: string): string {
  try {
    return `[источник: ${new URL(url).hostname.replace(/^www\./, "")}]`;
  } catch {
    return "[источник]";
  }
}

/**
 * Replace every URL with a domain-only marker.
 * Keeps attribution readable for the model while making the link unfetchable.
 */
export function neutralizeUrlsInText(text: string): string {
  return text
    .replace(MARKDOWN_LINK, (_m, label: string, url: string) =>
      label.trim() ? `${label} ${sourceLabel(url)}` : sourceLabel(url),
    )
    .replace(BARE_URL, (url) => {
      // Keep sentence punctuation that glued onto the end of the link
      const trailing = url.match(/[.,;:!?]+$/)?.[0] ?? "";
      return sourceLabel(url.slice(0, url.length - trailing.length)) + trailing;
    });
}
