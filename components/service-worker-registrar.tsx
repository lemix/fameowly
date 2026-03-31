"use client";

import { useEffect } from "react";

/** Register the service worker for PWA support */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed — silent, app works fine without it
      });
    }
  }, []);

  return null;
}
