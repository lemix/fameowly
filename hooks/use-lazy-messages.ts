"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { MessageData } from "@/lib/types";

const PAGE_SIZE = 20;

interface UseLazyMessagesParams {
  messages: MessageData[];
}

/**
 * Provides paginated (lazy-loaded) messages for reverse infinite scroll.
 * Initially shows only the last PAGE_SIZE messages.
 * Calling `loadMore()` prepends the next batch.
 * Resets when the full messages array changes identity (new chat loaded).
 */
export function useLazyMessages({ messages }: UseLazyMessagesParams) {
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Reset display count when messages array changes identity (new chat)
  const messagesLength = messages.length;
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [messagesLength]);

  const hasMore = displayCount < messages.length;

  const visibleMessages = useMemo(() => {
    if (messages.length <= displayCount) return messages;
    return messages.slice(messages.length - displayCount);
  }, [messages, displayCount]);

  const loadMore = useCallback(() => {
    setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, messages.length));
  }, [messages.length]);

  return { visibleMessages, hasMore, loadMore };
}
