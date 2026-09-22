"use client";

import { useEffect } from "react";

/** Waits for fonts and images so nothing is missing on the first printed page. */
function waitForAssets(): Promise<unknown> {
  const images = Array.from(document.images)
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    );
  return Promise.all([document.fonts.ready, ...images]);
}

/** Opens the print dialog once the transcript is fully laid out. */
export function PrintTrigger({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (!auto) return;
    let timer: ReturnType<typeof setTimeout>;

    // A timer, not requestAnimationFrame: the tab may open in the background,
    // where animation frames never fire
    waitForAssets().then(() => {
      timer = setTimeout(() => window.print(), 50);
    });

    return () => clearTimeout(timer);
  }, [auto]);

  return null;
}
