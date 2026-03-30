"use client";

import { useState, useCallback, useEffect } from "react";
import type { ImageHistoryItemClient } from "@/lib/types";

export function useImageHistory() {
  const [imageHistory, setImageHistory] = useState<ImageHistoryItemClient[]>([]);

  const loadImageHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/images");
      if (res.ok) {
        const data = await res.json();
        setImageHistory(
          (data.history || []).map(
            (item: ImageHistoryItemClient & { createdAt: string }) => ({
              ...item,
              createdAt: new Date(item.createdAt),
            })
          )
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadImageHistory();
  }, [loadImageHistory]);

  return { imageHistory, loadImageHistory };
}
