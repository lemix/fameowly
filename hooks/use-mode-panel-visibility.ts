"use client";

import { useState, useEffect, useRef, type RefObject } from "react";

const BOTTOM_THRESHOLD = 80; // px from bottom to consider "at bottom"

/**
 * Controls the floating mode-panel visibility.
 *
 * Visible when:
 * - Chat is empty (no scroll).
 * - User has scrolled to the very bottom of the chat.
 * - User is actively preparing a prompt (inputActive = true):
 *   textarea focused, has text, or has file attachments.
 *
 * Hidden otherwise (user is reading old messages mid-chat).
 */
export function useModePanelVisibility({
  scrollContainerRef,
  isEmpty,
  inputActive,
}: {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  isEmpty: boolean;
  /** true when textarea is focused, has text, or has attachments */
  inputActive: boolean;
}) {
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    if (isEmpty) { setAtBottom(true); return; }

    const el = scrollContainerRef.current;
    if (!el) return;

    let ticking = false;

    const check = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
        setAtBottom(dist < BOTTOM_THRESHOLD);
        ticking = false;
      });
    };

    // Initial check
    check();

    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [scrollContainerRef, isEmpty]);

  const isVisible = isEmpty || atBottom || inputActive;

  return { isVisible };
}
