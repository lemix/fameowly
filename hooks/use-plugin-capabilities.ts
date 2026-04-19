"use client";

import { useState, useEffect } from "react";

interface PluginCapabilities {
  hasPlugins: boolean;
  plugins: string[];
}

const cache: { value: PluginCapabilities | null; promise: Promise<PluginCapabilities> | null } = {
  value: null,
  promise: null,
};

const EMPTY: PluginCapabilities = { hasPlugins: false, plugins: [] };

function fetchCapabilities(): Promise<PluginCapabilities> {
  if (cache.promise) return cache.promise;
  cache.promise = fetch("/api/plugins/capabilities")
    .then((r) => (r.ok ? r.json() : EMPTY))
    .then((data: PluginCapabilities) => {
      cache.value = data;
      return data;
    })
    .catch(() => EMPTY);
  return cache.promise;
}

/** Returns plugin capabilities (which plugins are loaded). Caches after first fetch. */
export function usePluginCapabilities(): PluginCapabilities {
  const [caps, setCaps] = useState<PluginCapabilities>(
    () => cache.value ?? EMPTY,
  );

  useEffect(() => {
    if (cache.value) {
      setCaps(cache.value);
      return;
    }
    fetchCapabilities().then(setCaps);
  }, []);

  return caps;
}
