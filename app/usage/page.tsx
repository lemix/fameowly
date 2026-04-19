"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  MessageSquare,
  Image,
} from "lucide-react";
import type { UsageRecord } from "@/lib/types";

const PAGE_SIZE = 20;

interface UsageResponse {
  records: UsageRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function UsagePage() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUsage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usage?page=${p}&pageSize=${PAGE_SIZE}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage(page);
  }, [page, fetchUsage]);

  const totalCost = data?.records.reduce((sum, r) => sum + r.cost, 0) ?? 0;

  return (
    <div className="flex h-[100dvh] flex-col bg-th-page text-th-fg overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-th-border px-6 py-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-th-fg-s transition hover:bg-th-panel hover:text-th-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <h1 className="text-lg font-bold">
          <BarChart3 className="mr-2 inline h-5 w-5 text-th-accent" />
          Потребление
        </h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-8">
          {/* Summary */}
          {data && (
            <div className="mb-6 flex gap-4">
              <div className="rounded-xl border border-th-border bg-th-panel/80 px-5 py-3">
                <div className="text-xs text-th-fg-m">Всего запросов</div>
                <div className="text-2xl font-bold">{data.total}</div>
              </div>
              <div className="rounded-xl border border-th-border bg-th-panel/80 px-5 py-3">
                <div className="text-xs text-th-fg-m">Стоимость (страница)</div>
                <div className="text-2xl font-bold">
                  {totalCost > 0 ? totalCost.toFixed(4) : "0"}
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl border border-th-border bg-th-panel/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-th-border bg-th-subtle/50">
                    <th className="px-4 py-3 text-left font-medium text-th-fg-m">Дата</th>
                    <th className="px-4 py-3 text-left font-medium text-th-fg-m">Тип</th>
                    <th className="px-4 py-3 text-left font-medium text-th-fg-m">Модель</th>
                    <th className="px-4 py-3 text-right font-medium text-th-fg-m">Промпт</th>
                    <th className="px-4 py-3 text-right font-medium text-th-fg-m">Ответ</th>
                    <th className="px-4 py-3 text-right font-medium text-th-fg-m">Всего</th>
                    <th className="px-4 py-3 text-right font-medium text-th-fg-m">Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !data && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-th-fg-m">
                        Загрузка…
                      </td>
                    </tr>
                  )}
                  {data && data.records.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-th-fg-m">
                        Нет данных о потреблении
                      </td>
                    </tr>
                  )}
                  {data?.records.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-th-border/50 hover:bg-th-subtle/30 transition"
                    >
                      <td className="px-4 py-3 text-th-fg-s whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {r.type === "chat" ? (
                          <span className="inline-flex items-center gap-1 text-th-accent">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Чат
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-th-purple">
                            <Image className="h-3.5 w-3.5" />
                            Фото
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.modelName}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-th-fg-s">
                        {r.promptTokens > 0 ? r.promptTokens.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-th-fg-s">
                        {r.completionTokens > 0 ? r.completionTokens.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {r.totalTokens > 0 ? r.totalTokens.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.cost > 0 ? r.cost.toFixed(6) : "0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-th-border px-4 py-3">
                <div className="text-sm text-th-fg-m">
                  Страница {data.page} из {data.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 rounded-lg border border-th-border px-3 py-1.5 text-sm transition hover:bg-th-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Назад
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page >= data.totalPages}
                    className="flex items-center gap-1 rounded-lg border border-th-border px-3 py-1.5 text-sm transition hover:bg-th-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Вперёд
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
