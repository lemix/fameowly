/**
 * Grounding metadata extraction.
 *
 * Turns Google's raw provider metadata into a small plain-data shape that is
 * safe to persist and render. Nothing here ever goes back into the LLM prompt.
 */

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface MessageGrounding {
  /** Search queries the model actually executed */
  queries?: string[];
  /** Pages the answer was grounded in */
  sources?: GroundingSource[];
  /**
   * Search Suggestions parsed out of `searchEntryPoint.renderedContent`.
   * Not persisted — the redirect URLs expire after a few days.
   */
  suggestions?: Array<{ url: string; label: string }>;
}

const MAX_ITEMS = 12;
const ANCHOR = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

function decodeEntities(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Parse the Search Suggestions widget into link/label pairs.
 * The raw HTML is never handed to the DOM — only validated https hrefs
 * and text-only labels survive.
 */
function parseSearchSuggestions(html: string): Array<{ url: string; label: string }> {
  const chips: Array<{ url: string; label: string }> = [];
  for (const match of html.matchAll(ANCHOR)) {
    const url = decodeEntities(match[1]);
    const label = decodeEntities(match[2]);
    if (!label || !isHttps(url)) continue;
    chips.push({ url, label });
    if (chips.length >= MAX_ITEMS) break;
  }
  return chips;
}

type RawMetadata = Record<string, unknown> | undefined;

function readGoogleSection(providerMetadata: RawMetadata): Record<string, unknown> | undefined {
  if (!providerMetadata) return undefined;
  // Vertex reports under "vertex", the Generative AI API under "google".
  const section = providerMetadata.google ?? providerMetadata.vertex;
  return section && typeof section === "object" ? (section as Record<string, unknown>) : undefined;
}

/** Extract grounding info from `providerMetadata`; undefined when nothing was grounded. */
export function extractGrounding(providerMetadata: RawMetadata): MessageGrounding | undefined {
  const section = readGoogleSection(providerMetadata);
  const raw = section?.groundingMetadata as Record<string, unknown> | null | undefined;
  if (!raw) return undefined;

  const queries = Array.isArray(raw.webSearchQueries)
    ? (raw.webSearchQueries as unknown[]).filter((q): q is string => typeof q === "string" && q.length > 0)
    : [];

  const sources: GroundingSource[] = [];
  if (Array.isArray(raw.groundingChunks)) {
    for (const chunk of raw.groundingChunks as Array<Record<string, unknown>>) {
      const web = chunk?.web as { uri?: string; title?: string } | undefined;
      if (!web?.uri || sources.some((s) => s.uri === web.uri)) continue;
      sources.push({ uri: web.uri, title: web.title || web.uri });
      if (sources.length >= MAX_ITEMS) break;
    }
  }

  const rendered = (raw.searchEntryPoint as { renderedContent?: string } | undefined)?.renderedContent;
  const suggestions = rendered ? parseSearchSuggestions(rendered) : [];

  if (!queries.length && !sources.length && !suggestions.length) return undefined;
  return {
    ...(queries.length ? { queries: queries.slice(0, MAX_ITEMS) } : {}),
    ...(sources.length ? { sources } : {}),
    ...(suggestions.length ? { suggestions } : {}),
  };
}

/** Number of billable search queries reported for a completed generation. */
export function countSearchQueries(providerMetadata: RawMetadata): number {
  const raw = readGoogleSection(providerMetadata)?.groundingMetadata as
    | { webSearchQueries?: unknown }
    | null
    | undefined;
  if (!raw || !Array.isArray(raw.webSearchQueries)) return 0;
  return raw.webSearchQueries.filter((q) => typeof q === "string" && q.length > 0).length;
}
