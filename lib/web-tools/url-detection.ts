/**
 * URL gate for the URL Context tool.
 *
 * The tool is attached only when the *current* user message carries a URL,
 * so old links never get re-fetched (retrieved content is billed as input tokens).
 */

import { isBlockedIp, normalizeIpLiteral } from "./ip-guard";

const URL_PATTERN = /https?:\/\/[^\s<>"'`)\]}]+/gi;

/** Hosts no fetcher may reach: loopback, LAN, metadata endpoints, obfuscated IPs. */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  // A name still has to pass the DNS check later; only literals can be judged here.
  return normalizeIpLiteral(h) !== null && isBlockedIp(h);
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
