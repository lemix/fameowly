/**
 * Article extraction: HTML → plain text fit for a prompt.
 *
 * `linkedom` + Readability (~1 MB, no native bindings) instead of jsdom (~7 MB).
 * Markdown conversion is deliberately skipped: at ~200 tok/s of prompt processing
 * on the local server, structural markup does not earn back the tokens it costs.
 */

import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

const DEFAULT_MAX_CHARS = 12000;

/** Zero-width and bidi-override characters are a classic hidden-instruction vector. */
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

const STRIP_TAGS = /<(script|style|noscript|svg|nav|footer|header|aside|form)\b[^>]*>[\s\S]*?<\/\1>/gi;

export interface ExtractedArticle {
  title: string;
  text: string;
  truncated: boolean;
}

function normalize(raw: string): string {
  return raw
    .replace(INVISIBLE, "")
    .replace(/\r/g, "")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Last resort for pages Readability cannot make sense of. */
function stripTags(html: string): string {
  return normalize(
    html
      .replace(STRIP_TAGS, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(?:39|x27);/g, "'")
      .replace(/&amp;/g, "&"),
  );
}

function readTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalize(match[1]).slice(0, 200) : "";
}

/**
 * Extract the readable body of a page.
 * Never throws: an unparseable page yields empty text, which the caller reports
 * to the model instead of feeding it markup.
 */
export function extractArticle(
  html: string,
  url: string,
  maxChars: number = DEFAULT_MAX_CHARS,
): ExtractedArticle {
  let title = "";
  let text = "";

  try {
    const { document } = parseHTML(html);
    const article = new Readability(document as unknown as Document, {
      charThreshold: 200,
    }).parse();
    if (article) {
      title = normalize(article.title ?? "");
      text = normalize(article.textContent ?? "");
    }
  } catch {
    // fall through to the tag stripper
  }

  // Readability targets articles; on index pages it returns a cookie banner and
  // little else, while plain tag stripping still yields the headlines.
  if (text.length < 1000) {
    const stripped = stripTags(html);
    if (stripped.length > text.length * 3) text = stripped;
  }
  if (!title) title = readTitle(html) || new URL(url).hostname;

  const truncated = text.length > maxChars;
  return { title, text: truncated ? text.slice(0, maxChars) : text, truncated };
}
