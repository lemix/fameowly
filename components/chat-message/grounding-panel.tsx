"use client";

import { Globe, Search } from "lucide-react";
import type { MessageGrounding } from "@/lib/types";

interface GroundingPanelProps {
  grounding: MessageGrounding;
}

function safeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function hostLabel(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return uri;
  }
}

/**
 * Build Search Suggestions chips.
 * Live responses carry Google's own chips; persisted messages fall back to the
 * executed queries, because Google's redirect URLs expire after a few days.
 */
function suggestionChips(grounding: MessageGrounding): Array<{ url: string; label: string }> {
  const live = (grounding.suggestions ?? [])
    .map((chip) => ({ url: safeHttpsUrl(chip.url), label: chip.label }))
    .filter((chip): chip is { url: string; label: string } => chip.url !== null);
  if (live.length > 0) return live;

  return (grounding.queries ?? []).map((query) => ({
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    label: query,
  }));
}

/**
 * Renders Google Search Suggestions and grounding sources.
 * Suggestions are required by the Grounding with Google Search terms of use.
 */
export function GroundingPanel({ grounding }: GroundingPanelProps) {
  const chips = suggestionChips(grounding);
  const sources = (grounding.sources ?? [])
    .map((source) => ({ ...source, href: safeHttpsUrl(source.uri) }))
    .filter((source) => source.href !== null);

  if (chips.length === 0 && sources.length === 0) return null;

  return (
    <div className="w-full space-y-2" data-testid="grounding-panel">
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] text-th-fg-f">
            <Search className="h-3 w-3" />
            Google
          </span>
          {chips.map((chip) => (
            <a
              key={chip.url}
              href={chip.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-full bg-th-subtle/60 px-2.5 py-1 text-[11px] text-th-fg-m transition hover:bg-th-subtle hover:text-th-fg"
            >
              {chip.label}
            </a>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] text-th-fg-f">
            <Globe className="h-3 w-3" />
            Источники
          </span>
          {sources.map((source, idx) => (
            <a
              key={source.uri}
              href={source.href!}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={source.title}
              className="max-w-[200px] truncate rounded-full bg-th-subtle/60 px-2.5 py-1 text-[11px] text-th-fg-m transition hover:bg-th-subtle hover:text-th-fg"
            >
              {idx + 1}. {hostLabel(source.uri)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
