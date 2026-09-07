"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

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
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "auto") return stored;
  return "auto";
}

/**
 * SSR has no localStorage, so it must render the same value the client renders
 * while hydrating. `useSyncExternalStore` re-reads the real value right after
 * hydration instead of tripping a hydration mismatch.
 */
function getServerTheme(): ThemeMode {
  return "auto";
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function applyTheme(mode: ThemeMode) {
  const resolved = mode === "auto" ? getSystemTheme() : mode;
  document.documentElement.classList.toggle("dark", resolved === "dark");

  // Update meta theme-color for mobile toolbar tinting
  const color = resolved === "dark" ? "#1c263c" : "#ffffff";
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((el) => (el.content = color));
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * Theme hook with three modes: auto (system), light, dark.
 * Persists choice to localStorage, applies .dark class on <html>.
 *
 * The first paint is owned by the anti-FOUC script in `app/layout.tsx`; this
 * hook only re-applies on an explicit change or a system-preference change,
 * so the pre-hydration "auto" snapshot can never flash the wrong theme.
 */
export function useTheme() {
  const mode = useSyncExternalStore(subscribe, getStoredTheme, getServerTheme);

  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, m);
    listeners.forEach((l) => l());
    applyTheme(m);
  }, []);

  /** Cycle through auto → light → dark → auto */
  const cycleTheme = useCallback(() => {
    const idx = CYCLE_ORDER.indexOf(mode);
    const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    setMode(next);
  }, [mode, setMode]);

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
