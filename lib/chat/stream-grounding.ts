/**
 * Grounding for a streamed answer, collected from every source at once:
 * pre-fetched pages, results of executed web tools, Google grounding metadata.
 *
 * The client replaces its grounding on every metadata chunk, so each emission
 * carries the full accumulated value, never a delta.
 */

import { extractGrounding, mergeGrounding, countSearchQueries } from "../web-tools/grounding";
import type { MessageGrounding, GroundingSource } from "../web-tools/grounding";
import type { WebToolOutput } from "../contracts";

interface StreamPartLike {
  type: string;
  output?: unknown;
  providerMetadata?: Record<string, unknown>;
}

function isSource(value: unknown): value is GroundingSource {
  const s = value as GroundingSource | null;
  return typeof s?.uri === "string" && typeof s.title === "string";
}

/** Tool output is arbitrary data; only the documented fields are trusted. */
function readToolOutput(output: unknown): WebToolOutput {
  if (!output || typeof output !== "object") return {};
  const raw = output as WebToolOutput;
  const sources = Array.isArray(raw.grounding?.sources) ? raw.grounding.sources.filter(isSource) : [];
  return {
    ...(sources.length ? { grounding: { sources } } : {}),
    ...(typeof raw.searchQueries === "number" && raw.searchQueries > 0 ? { searchQueries: raw.searchQueries } : {}),
  };
}

export function createGroundingTracker(initial: MessageGrounding | undefined) {
  let current = initial;
  return (part: StreamPartLike): MessageGrounding | undefined => {
    // Re-sent at every step start so pre-fetched sources show before the answer.
    if (part.type === "start-step") return current;
    const next =
      part.type === "tool-result" ? readToolOutput(part.output).grounding
      : part.type === "finish-step" ? extractGrounding(part.providerMetadata)
      : undefined;
    if (!next) return undefined;
    current = mergeGrounding(current, next);
    return current;
  };
}

/** Searches in one step: Google-reported queries plus searches run by our tools. */
export function countStepSearchQueries(step: {
  providerMetadata?: Record<string, unknown>;
  toolResults: Array<{ output: unknown }>;
}): number {
  return step.toolResults.reduce(
    (sum, result) => sum + (readToolOutput(result.output).searchQueries ?? 0),
    countSearchQueries(step.providerMetadata),
  );
}
