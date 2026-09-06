"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(display-mode: standalone)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getSnapshot() {
  // iOS Safari never matches display-mode, it exposes navigator.standalone instead
  return (
    window.matchMedia(QUERY).matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getServerSnapshot() {
  return false;
}

/** True when the app runs as an installed PWA rather than in a browser tab */
export function useStandaloneMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
