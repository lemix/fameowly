/**
 * SearXNG client — self-hosted metasearch, so family queries are never tied to
 * an account at a commercial engine.
 *
 * Uses plain `fetch`, NOT `safeFetch`: SearXNG is our own trusted service on the
 * internal network, and the SSRF guard would (correctly) refuse a private address.
 * Everything the search *returns* is untrusted and must go through `safeFetch`.
 */

import { isBlockedIp, normalizeIpLiteral } from "./ip-guard";

// SearXNG polls several upstream engines in parallel; its own per-engine budget
// is 6 s, so the client has to allow more than that before giving up.
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_LIMIT = 6;

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
  engines: string[];
}

interface RawHit {
  title?: string;
  url?: string;
  content?: string;
  engines?: string[];
  score?: number;
}

/** Configured SearXNG base URL, or null when web search is not deployed. */
export function getSearxngUrl(): string | null {
  const raw = process.env.SEARXNG_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

function isFetchableResult(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const literal = normalizeIpLiteral(url.hostname);
    return literal === null || !isBlockedIp(literal);
  } catch {
    return false;
  }
}

/**
 * Run a web search.
 * @returns ranked, de-duplicated hits (possibly none).
 * @throws when SearXNG is not configured or does not answer — callers must be able
 *   to tell "nothing found" from "search is down".
 */
export async function searchWeb(
  query: string,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<SearchHit[]> {
  const base = getSearxngUrl();
  if (!base) throw new Error("SEARXNG_URL is not set");
  if (!query.trim()) return [];

  const url = new URL(`${base}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "ru");
  url.searchParams.set("safesearch", "1");

  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  const response = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`SearXNG ${response.status}`);

  const payload = (await response.json()) as { results?: RawHit[] };
  const seen = new Set<string>();
  const hits: SearchHit[] = [];

  for (const raw of payload.results ?? []) {
    if (!raw.url || !raw.title || seen.has(raw.url)) continue;
    if (!isFetchableResult(raw.url)) continue;
    seen.add(raw.url);
    hits.push({
      title: raw.title,
      url: raw.url,
      snippet: (raw.content ?? "").trim(),
      engines: raw.engines ?? [],
    });
    if (hits.length >= (options.limit ?? DEFAULT_LIMIT)) break;
  }

  return hits;
}
