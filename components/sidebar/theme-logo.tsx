"use client";

import { useSyncExternalStore } from "react";

// ─── Dark class observer (reactive to .dark toggle) ──────────────────

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return true; // SSR assumes dark to match FOUC-prevention script default
}

// ─── Component ───────────────────────────────────────────────────────

/** Wordmark logo that reactively switches between dark and light variants */
export function ThemeLogo() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={isDark ? "/fameowly.svg" : "/fameowly-light.svg"}
      alt="Fameowly"
      width={343}
      height={71}
      className="w-[146px] shrink-0 select-none"
      draggable={false}
    />
  );
}
