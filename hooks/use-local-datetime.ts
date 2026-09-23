"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Formats an ISO timestamp in the *browser* timezone.
 * Renders empty on the server on purpose: the server has its own timezone, and
 * React keeps the server text on a hydration mismatch, which would freeze the
 * wrong time on screen.
 */
export function useLocalDateTime(iso?: string): string {
  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!hydrated || !iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
