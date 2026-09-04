"use client";

import { useState, useEffect } from "react";
import type { ChatStatus } from "@/lib/types";
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
 * Pass the chat `status`: the record is written server-side when the stream
 * finishes, so stats are refetched on every busy → idle transition.
 */
export function useChatUsage(chatId: string | null, status?: ChatStatus) {
  const { hasPlugins } = usePluginCapabilities();
  const [loaded, setLoaded] = useState<{ chatId: string; usage: ChatUsage } | null>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!hasPlugins || !chatId || busy) return;

    let cancelled = false;
    fetch(`/api/usage/chat?chatId=${encodeURIComponent(chatId)}`)
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((usage: ChatUsage) => {
        if (!cancelled) setLoaded({ chatId, usage });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ chatId, usage: EMPTY });
      });

    return () => { cancelled = true; };
  }, [hasPlugins, chatId, busy]);

  // Ignore data belonging to a previously opened chat
  const usage = loaded && loaded.chatId === chatId ? loaded.usage : EMPTY;

  return { usage, hasPlugins };
}
