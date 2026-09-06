"use client";

import { useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageHistoryItemClient } from "@/lib/types";
import { useScrollRunway } from "@/hooks/use-scroll-runway";
import { ConfirmModal } from "@/components/confirm-modal";

// ─── Types ───────────────────────────────────────────────────────────

interface ImageHistoryListProps {
  imageHistory: ImageHistoryItemClient[];
  activeImageId: string | null;
  searchQuery: string;
  onSelectImageItem: (item: ImageHistoryItemClient) => void;
  onDeleteImageHistory: (id: string) => void;
}

// ─── Date Grouping ──────────────────────────────────────────────────

interface DateGroup {
  label: string;
  items: ImageHistoryItemClient[];
}

function groupImagesByDate(items: ImageHistoryItemClient[]): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    today: [] as ImageHistoryItemClient[],
    yesterday: [] as ImageHistoryItemClient[],
    week: [] as ImageHistoryItemClient[],
    older: [] as ImageHistoryItemClient[],
  };

  for (const item of items) {
    const d = new Date(item.createdAt);
    if (d >= today) groups.today.push(item);
    else if (d >= yesterday) groups.yesterday.push(item);
    else if (d >= weekAgo) groups.week.push(item);
    else groups.older.push(item);
  }

  const result: DateGroup[] = [];
  if (groups.today.length) result.push({ label: "Сегодня", items: groups.today });
  if (groups.yesterday.length) result.push({ label: "Вчера", items: groups.yesterday });
  if (groups.week.length) result.push({ label: "Предыдущие 7 дней", items: groups.week });
  if (groups.older.length) result.push({ label: "Ранее", items: groups.older });

  return result;
}

// ─── Component ───────────────────────────────────────────────────────

export function ImageHistoryList({
  imageHistory,
  activeImageId,
  searchQuery,
  onSelectImageItem,
  onDeleteImageHistory,
}: ImageHistoryListProps) {
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? imageHistory.filter((i) => i.prompt.toLowerCase().includes(query))
    : imageHistory;
  const groups = groupImagesByDate(filtered);
  const { ref, runway } = useScrollRunway<HTMLDivElement>(filtered);

  return (
    <div
      ref={ref}
      className="flex flex-1 flex-col overflow-y-auto px-[18px]"
      style={{ paddingBottom: runway || 8 }}
    >
      {filtered.length === 0 && (
        <p className="px-[10px] py-8 text-center text-sm text-th-fg-f">
          {query ? "Ничего не найдено" : "Нет сгенерированных изображений"}
        </p>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          {/* Top padding belongs to the header, not the container: `top-0` pins
              to the padding box and would leave rows visible above it */}
          <div className="sticky top-0 z-20 bg-th-sidebar pt-[20px] pb-[14px] pl-[10px]">
            <p className="text-[16px] font-semibold leading-none text-th-fg">
              {group.label}
            </p>
          </div>
          {group.items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectImageItem(item)}
              className={cn(
                "group relative z-0 flex cursor-pointer items-start gap-2.5 rounded-[10px] p-[10px] text-sm transition-colors",
                activeImageId === item.id
                  ? "bg-th-accent-bg text-th-fg"
                  : "bg-th-sidebar text-th-fg hover:bg-th-subtle"
              )}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-th-muted">
                  <ImageIcon className="h-4 w-4 text-th-fg-f" />
                </div>
              )}
              <span className="line-clamp-2 min-w-0 flex-1 leading-[1.4]">{item.prompt}</span>

              {/* Action strip — inherits the row background so it masks the clamped prompt */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-y-px right-px flex items-stretch bg-inherit transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
              >
                <div className="w-6 bg-inherit [mask-image:linear-gradient(to_right,transparent,#000)]" />
                <div className="flex items-center rounded-r-[9px] bg-inherit pr-[6px]">
                  <button
                    onClick={() => setDeleteImageId(item.id)}
                    aria-label="Удалить изображение"
                    className="rounded-lg p-1 text-th-fg-m transition hover:text-th-red"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Image delete confirmation modal */}
      <ConfirmModal
        open={deleteImageId !== null}
        title="Удалить изображение?"
        message="Изображение и его история будут удалены без возможности восстановления."
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={() => {
          if (deleteImageId) onDeleteImageHistory(deleteImageId);
          setDeleteImageId(null);
        }}
        onCancel={() => setDeleteImageId(null)}
      />
    </div>
  );
}
