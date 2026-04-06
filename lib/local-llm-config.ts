/**
 * Local LLM URL resolution — supports both single-endpoint (llama.cpp
 * with internal routing) and per-model endpoints (ik_llama.cpp).
 *
 * Environment variables (priority order):
 *   1. LOCAL_LLM_HOSTS — JSON map { "model-id": "http://host:port/v1", … }
 *   2. LOCAL_LLM_URL   — single base URL (default fallback)
 *   3. http://127.0.0.1:8080/v1
 */

const DEFAULT_LOCAL_URL = "http://127.0.0.1:8080/v1";

let _hostsCache: Record<string, string> | null = null;

function getHostsMap(): Record<string, string> {
  if (_hostsCache !== null) return _hostsCache;

  const raw = process.env.LOCAL_LLM_HOSTS;
  if (!raw) {
    _hostsCache = {};
    return _hostsCache;
  }

  try {
    _hostsCache = JSON.parse(raw) as Record<string, string>;
  } catch (err) {
    console.error("[local-llm-config] Failed to parse LOCAL_LLM_HOSTS:", err);
    _hostsCache = {};
  }

  return _hostsCache;
}

/**
 * Resolve the OpenAI-compatible base URL for a given local model.
 *
 * Resolution order:
 *   1. Per-model entry in LOCAL_LLM_HOSTS (ik_llama.cpp without internal routing)
 *   2. LOCAL_LLM_URL (llama.cpp with internal routing, or single-model setup)
 *   3. Default: http://127.0.0.1:8080/v1
 */
export function getLocalLLMBaseURL(modelId: string): string {
  const hosts = getHostsMap();

  if (hosts[modelId]) {
    return hosts[modelId];
  }

  return process.env.LOCAL_LLM_URL || DEFAULT_LOCAL_URL;
}
