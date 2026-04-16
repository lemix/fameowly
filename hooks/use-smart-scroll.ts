"use client";

import { useRef, useCallback, useEffect } from "react";

const BOTTOM_THRESHOLD = 80; // px from bottom to consider "at bottom"

interface UseSmartScrollParams {
  /** Whether the model is currently streaming a response */
  isStreaming: boolean;
  /** Active chat ID — triggers scroll-to-bottom on chat switch */
  chatId: string | null;
}

/**
 * Manages smart auto-scroll for the chat container.
 *
 * - Auto-scrolls to bottom when streaming IF user is near bottom.
 * - Pauses auto-scroll when user scrolls up during generation.
 * - Resumes auto-scroll when user manually scrolls back to bottom.
 * - Provides scroll anchoring for prepended (lazy-loaded) messages.
 */
export function useSmartScroll({ isStreaming, chatId }: UseSmartScrollParams) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);

  /** Check if container is scrolled near bottom */
  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= BOTTOM_THRESHOLD;
  }, []);

  /** Scroll to the very bottom */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  /** Handle user scroll events — track if near bottom */
  const handleScroll = useCallback(() => {
    isNearBottomRef.current = checkNearBottom();
  }, [checkNearBottom]);

  /** Auto-scroll during streaming when user is near bottom */
  useEffect(() => {
    if (isStreaming && isNearBottomRef.current) {
      scrollToBottom("smooth");
    }
  });

  /** Scroll to bottom on new chat load */
  useEffect(() => {
    if (chatId === null) return;
    isNearBottomRef.current = true;
    // Use instant scroll with retry to handle late-rendered content
    const scroll = () => scrollToBottom("instant");
    requestAnimationFrame(scroll);
    // Second attempt catches content rendered after first rAF
    const timer = setTimeout(scroll, 100);
    return () => clearTimeout(timer);
  }, [chatId, scrollToBottom]);

  /**
   * Preserve scroll position when prepending messages (scroll anchoring).
   * Call this BEFORE the DOM updates with new messages at the top.
   */
  const saveScrollAnchor = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      prevScrollHeightRef.current = el.scrollHeight;
    }
  }, []);

  /**
   * Restore scroll position after prepending messages.
   * Call this AFTER the DOM has updated with new messages at the top.
   */
  const restoreScrollAnchor = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const newScrollHeight = el.scrollHeight;
    const delta = newScrollHeight - prevScrollHeightRef.current;
    if (delta > 0) {
      el.scrollTop += delta;
    }
  }, []);

  return {
    containerRef,
    handleScroll,
    scrollToBottom,
    saveScrollAnchor,
    restoreScrollAnchor,
  };
}
