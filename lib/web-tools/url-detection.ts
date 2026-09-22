/**
 * URL gate for the URL Context tool.
 *
 * The tool is attached only when the *current* user message carries a URL,
 * so old links never get re-fetched (retrieved content is billed as input tokens).
 */

const URL_PATTERN = /https?:\/\/[^\s<>"'`)\]}]+/gi;

/** Hosts the Gemini URL Context tool cannot reach; also blocks SSRF-shaped input. */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1") return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h) || /^0\./.test(h)) return true;
  if (/^(f[cd][0-9a-f]{2}:|fe80:)/.test(h)) return true;
  return false;
}

/** Extract publicly fetchable http(s) URLs from free text. */
export function extractPublicUrls(text: string): string[] {
  const found = text.match(URL_PATTERN);
  if (!found) return [];

  const urls: string[] = [];
  for (const raw of found) {
    // Trim trailing punctuation that regularly glues onto pasted links
    const cleaned = raw.replace(/[.,;:!?]+$/, "");
    try {
      const url = new URL(cleaned);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      if (isPrivateHost(url.hostname)) continue;
      if (!urls.includes(cleaned)) urls.push(cleaned);
    } catch {
      // not a parseable URL — ignore
    }
  }
  return urls;
}

/** True when the text contains at least one publicly fetchable URL. */
export function containsPublicUrl(text: string): boolean {
  return extractPublicUrls(text).length > 0;
}
