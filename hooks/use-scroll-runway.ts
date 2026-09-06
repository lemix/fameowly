"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Extra bottom padding for a scroll container with sticky group headers.
 *
 * When the last group is shorter than the viewport it can never reach the top,
 * so the previous group keeps touching the upper edge and its pinned header
 * stays on screen next to the new one. The runway is exactly the missing
 * distance, and it stays at zero while the list does not overflow.
 */
export function useScrollRunway<T extends HTMLElement>(deps: unknown) {
  const ref = useRef<T>(null);
  const [runway, setRunway] = useState(0);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const groups = Array.from(el.children) as HTMLElement[];
    const last = groups[groups.length - 1];
    if (!last) {
      setRunway(0);
      return;
    }
    const content = groups.reduce((sum, g) => sum + g.offsetHeight, 0);
    setRunway(content > el.clientHeight ? Math.max(0, el.clientHeight - last.offsetHeight) : 0);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // observe() fires once immediately, which doubles as the initial measurement
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [measure, deps]);

  return { ref, runway };
}
