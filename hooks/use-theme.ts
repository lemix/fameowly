"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────

export type ThemeMode = "auto" | "light" | "dark";

// ─── Constants ───────────────────────────────────────────────────────

const STORAGE_KEY = "theme";

const CYCLE_ORDER: ThemeMode[] = ["auto", "light", "dark"];

// ─── Helpers ─────────────────────────────────────────────────────────

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "auto") return stored;
  return "auto";
}

function applyTheme(mode: ThemeMode) {
  const resolved = mode === "auto" ? getSystemTheme() : mode;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * Theme hook with three modes: auto (system), light, dark.
 * Persists choice to localStorage, applies .dark class on <html>.
 */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getStoredTheme);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
    applyTheme(m);
  }, []);

  /** Cycle through auto → light → dark → auto */
  const cycleTheme = useCallback(() => {
    const idx = CYCLE_ORDER.indexOf(mode);
    const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    setMode(next);
  }, [mode, setMode]);

  // Apply on mount
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  // Listen for system preference changes when in auto mode
  useEffect(() => {
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  return { mode, setMode, cycleTheme } as const;
}
