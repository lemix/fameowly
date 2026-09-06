"use client";

import { useState, useEffect } from "react";
import type { ChatStatus } from "@/lib/types";

export interface ChatTokenUsage {
  promptTokens: number;
  completionTokens: number;
  requests: number;
  /** Last measured context size */
  contextTokens: number;
  /** Messages were deleted since the measurement, so the size is approximate */
  contextStale: boolean;
}

const EMPTY: ChatTokenUsage = {
  promptTokens: 0,
  completionTokens: 0,
  requests: 0,
  contextTokens: 0,
  contextStale: false,
};

/**
 * Token aggregate of one chat.
 * The aggregate is written server-side when a stream finishes, so it is
 * refetched on every busy → idle transition.
 */
export function useChatUsage(chatId: string | null, status?: ChatStatus): ChatTokenUsage {
  const [loaded, setLoaded] = useState<{ chatId: string; usage: ChatTokenUsage } | null>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!chatId || busy) return;

    let cancelled = false;
    fetch(`/api/chats/usage?chatId=${encodeURIComponent(chatId)}`)
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((usage: ChatTokenUsage) => {
        if (!cancelled) setLoaded({ chatId, usage });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ chatId, usage: EMPTY });
      });

    return () => { cancelled = true; };
  }, [chatId, busy]);

  // Ignore data belonging to a previously opened chat
  return loaded && loaded.chatId === chatId ? loaded.usage : EMPTY;
}
