"use client";

import { useState, useEffect, useCallback } from "react";
import { usePluginCapabilities } from "./use-plugin-capabilities";

interface ChatUsage {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  /** Last request's prompt tokens = approximate current context size */
  lastContextTokens: number;
}

const EMPTY: ChatUsage = { totalTokens: 0, totalCost: 0, requestCount: 0, lastContextTokens: 0 };

/**
 * Fetch aggregated token usage for a specific chat.
 * Returns zeros when plugins are not active or chatId is null.
 * Pass messageCount to auto-refresh after new messages.
 */
export function useChatUsage(chatId: string | null, messageCount?: number) {
  const { hasPlugins } = usePluginCapabilities();
  const [usage, setUsage] = useState<ChatUsage>(EMPTY);
  const [version, setVersion] = useState(0);

  /** Call after each message to refresh stats */
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!hasPlugins || !chatId) {
      setUsage(EMPTY);
      return;
    }

    let cancelled = false;
    fetch(`/api/usage/chat?chatId=${encodeURIComponent(chatId)}`)
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((data: ChatUsage) => {
        if (!cancelled) setUsage(data);
      })
      .catch(() => {
        if (!cancelled) setUsage(EMPTY);
      });

    return () => { cancelled = true; };
  }, [hasPlugins, chatId, version, messageCount]);

  return { usage, refresh, hasPlugins };
}
