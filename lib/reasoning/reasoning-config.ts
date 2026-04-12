/**
 * Reasoning tag configurations for different LLM model families.
 * Used as fallback when the llama.cpp server doesn't separate reasoning_content.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface ReasoningTagPair {
  openTag: string;
  closeTag: string;
}

// ─── Tag configurations per model family ─────────────────────────────

const MODEL_TAG_MAP: Array<{ pattern: RegExp; tags: ReasoningTagPair[] }> = [
  // Qwen / DeepSeek family: symmetric <think>...</think>
  {
    pattern: /qwen|deepseek/i,
    tags: [{ openTag: "<think>", closeTag: "</think>" }],
  },
  // Gemma 4 (GGUF in llama.cpp): asymmetric <|think|>...</think>
  // Gemma 4 (HuggingFace official): <|channel>thought\n...<channel|>
  {
    pattern: /gemma.*(4|31b)/i,
    tags: [
      { openTag: "<|think|>", closeTag: "</think>" },
      { openTag: "<|channel>thought\n", closeTag: "<channel|>" },
    ],
  },
  // Gemma 3 IT: standard <think>...</think>
  {
    pattern: /gemma.*3/i,
    tags: [{ openTag: "<think>", closeTag: "</think>" }],
  },
  // Cohere Command R: <|START_THINKING|>...<|END_THINKING|>
  {
    pattern: /command-r|cohere/i,
    tags: [{ openTag: "<|START_THINKING|>", closeTag: "<|END_THINKING|>" }],
  },
  // Mistral Reasoning: [THINK]...[/THINK]
  {
    pattern: /ministral.*reason/i,
    tags: [{ openTag: "[THINK]", closeTag: "[/THINK]" }],
  },
];

/** Default fallback: standard <think> tags */
const DEFAULT_TAGS: ReasoningTagPair[] = [
  { openTag: "<think>", closeTag: "</think>" },
];

// ─── Public API ──────────────────────────────────────────────────────

/** Resolve reasoning tag pairs for a given model ID */
export function getReasoningTags(modelId: string): ReasoningTagPair[] {
  for (const entry of MODEL_TAG_MAP) {
    if (entry.pattern.test(modelId)) return entry.tags;
  }
  return DEFAULT_TAGS;
}

/** All unique tag pairs across all model families (used by sanitizer) */
export function getAllKnownTags(): ReasoningTagPair[] {
  const seen = new Set<string>();
  const result: ReasoningTagPair[] = [];

  for (const entry of MODEL_TAG_MAP) {
    for (const pair of entry.tags) {
      const key = `${pair.openTag}|${pair.closeTag}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(pair);
      }
    }
  }
  // Add defaults if not already included
  for (const pair of DEFAULT_TAGS) {
    const key = `${pair.openTag}|${pair.closeTag}`;
    if (!seen.has(key)) {
      result.push(pair);
    }
  }
  return result;
}

/** System prompt instruction to suppress reasoning */
export const NO_REASONING_INSTRUCTION =
  "\n\nAnswer directly without using reasoning blocks or thinking tags. Do not wrap your thoughts in <think>, <|think|>, or similar tags. Provide your response immediately.";
