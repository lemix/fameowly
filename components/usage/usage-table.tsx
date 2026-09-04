"use client";

import { Fragment } from "react";
import { MessageSquare, Image as ImageIcon } from "lucide-react";
import { formatCost } from "@/lib/pricing";
import type { UsageMonthView, UsagePeriodSummary } from "@/lib/usage-periods";
import type { UsageRecord } from "@/lib/types";
import {
  formatMonthKey,
  formatRange,
  formatRecordDate,
  formatTokens,
} from "./usage-format";

const COLUMN_COUNT = 7;

function PeriodRow({
  title,
  summary,
  variant,
}: {
  title: string;
  summary: UsagePeriodSummary;
  variant: "month" | "week";
}) {
  const isMonth = variant === "month";
  return (
    <tr className={isMonth ? "bg-th-subtle/70" : "bg-th-subtle/30"}>
      <td colSpan={COLUMN_COUNT - 2} className="px-4 py-2">
        <span className={isMonth ? "text-sm font-semibold" : "text-xs font-medium text-th-fg-s"}>
          {title}
        </span>
        <span className="ml-2 text-xs text-th-fg-m">
          {summary.from && `(${formatRange(summary.from, summary.to)})`} ·{" "}
          {summary.requestCount} запр.
        </span>
      </td>
      <td className="px-4 py-2 text-right text-xs tabular-nums text-th-fg-s">
        {formatTokens(summary.totalTokens)}
      </td>
      <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums">
        {formatCost(summary.totalCost)}
      </td>
    </tr>
  );
}

function RecordRow({ record }: { record: UsageRecord }) {
  return (
    <tr className="border-b border-th-border/50 transition hover:bg-th-subtle/30">
      <td className="whitespace-nowrap px-4 py-3 text-th-fg-s">
        {formatRecordDate(record.createdAt)}
      </td>
      <td className="px-4 py-3">
        {record.type === "chat" ? (
          <span className="inline-flex items-center gap-1 text-th-accent">
            <MessageSquare className="h-3.5 w-3.5" />
            Чат
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-th-purple">
            <ImageIcon className="h-3.5 w-3.5" />
            Фото
          </span>
        )}
      </td>
      <td className="px-4 py-3 font-medium">{record.modelName}</td>
      <td className="px-4 py-3 text-right tabular-nums text-th-fg-s">
        {formatTokens(record.promptTokens)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-th-fg-s">
        {formatTokens(record.completionTokens)}
      </td>
      <td className="px-4 py-3 text-right font-medium tabular-nums">
        {formatTokens(record.totalTokens)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatCost(record.cost)}
      </td>
    </tr>
  );
}

/** Segmented usage table: month header → week headers → records */
export function UsageTable({
  view,
  loading,
}: {
  view: UsageMonthView | null;
  loading: boolean;
}) {
  const isEmpty = !view || view.weeks.length === 0;

  return (
    <div className="overflow-x-auto rounded-xl border border-th-border bg-th-panel/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-th-border bg-th-subtle/50">
            <th className="px-4 py-3 text-left font-medium text-th-fg-m">Дата</th>
            <th className="px-4 py-3 text-left font-medium text-th-fg-m">Тип</th>
            <th className="px-4 py-3 text-left font-medium text-th-fg-m">Модель</th>
            <th className="px-4 py-3 text-right font-medium text-th-fg-m">Промпт</th>
            <th className="px-4 py-3 text-right font-medium text-th-fg-m">Ответ</th>
            <th className="px-4 py-3 text-right font-medium text-th-fg-m">Всего</th>
            <th className="px-4 py-3 text-right font-medium text-th-fg-m">Стоимость</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-4 py-8 text-center text-th-fg-m">
                Загрузка…
              </td>
            </tr>
          )}

          {!loading && isEmpty && (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-4 py-8 text-center text-th-fg-m">
                Нет данных о потреблении
              </td>
            </tr>
          )}

          {!loading && view && !isEmpty && (
            <>
              <PeriodRow
                variant="month"
                title={`Потребление за месяц — ${formatMonthKey(view.month.key)}`}
                summary={view.month}
              />
              {view.weeks.map((week) => (
                <Fragment key={week.key}>
                  <PeriodRow
                    variant="week"
                    title="Потребление за неделю"
                    summary={week}
                  />
                  {week.records.map((record) => (
                    <RecordRow key={record.id} record={record} />
                  ))}
                </Fragment>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
