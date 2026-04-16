"use client";

import { useState, useEffect } from "react";

const KEYBOARD_RATIO = 0.75;

/**
 * Tracks the VisualViewport API to detect mobile keyboard open/close.
 * Returns dynamic viewport height and a keyboard-open flag.
 * Gracefully degrades when the API is unavailable.
 */
export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let rafId = 0;

    const update = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const base = window.innerHeight;
        const ratio = base > 0 ? vv.height / base : 1;
        setIsKeyboardOpen(ratio < KEYBOARD_RATIO);
        setViewportHeight(vv.height);
      });
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return { viewportHeight, isKeyboardOpen };
}
