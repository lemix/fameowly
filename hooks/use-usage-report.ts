"use client";

import { useState, useEffect } from "react";
import type { UsageApiResponse } from "@/components/usage/usage-format";

const EMPTY: UsageApiResponse = { months: [], view: null };

/**
 * Load month-grouped usage records.
 * `userId` is admin-only; omit it to load the current user's data.
 * A null month means "the most recent month with data".
 */
export function useUsageReport(userId?: string) {
  const [month, setMonth] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ key: string; data: UsageApiResponse } | null>(null);

  const requestKey = `${userId ?? ""}|${month ?? ""}`;

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (month) params.set("month", month);

    fetch(`/api/usage?${params}`)
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((data: UsageApiResponse) => {
        if (!cancelled) setLoaded({ key: requestKey, data });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: requestKey, data: EMPTY });
      });

    return () => { cancelled = true; };
  }, [userId, month, requestKey]);

  const fresh = loaded?.key === requestKey ? loaded.data : null;

  return {
    months: fresh?.months ?? [],
    view: fresh?.view ?? null,
    activeMonth: month ?? fresh?.view?.month.key ?? null,
    setMonth,
    loading: fresh === null,
  };
}
