"use client";

import { useState } from "react";
import { Plus, ImageIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageHistoryItemClient } from "@/lib/types";
import { ConfirmModal } from "@/components/confirm-modal";

// ─── Types ───────────────────────────────────────────────────────────

interface ImageHistoryListProps {
  imageHistory: ImageHistoryItemClient[];
  activeImageId: string | null;
  onSelectImageItem: (item: ImageHistoryItemClient) => void;
  onDeleteImageHistory: (id: string) => void;
  onNewImageGeneration: () => void;
  onClose: () => void;
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
  onSelectImageItem,
  onDeleteImageHistory,
  onNewImageGeneration,
  onClose,
}: ImageHistoryListProps) {
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const groups = groupImagesByDate(imageHistory);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* New generation button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => { onNewImageGeneration(); onClose(); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-th-accent-bg border border-th-accent-ring px-4 py-3 text-sm font-medium text-th-accent transition-all hover:bg-th-accent-bg/80 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Новая генерация
        </button>
      </div>

      {/* Image items grouped by date */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {imageHistory.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-th-fg-f">
            Нет сгенерированных изображений
          </p>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <div className="sticky top-0 z-10 bg-th-sidebar px-1 pb-1.5 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-th-fg-f">
                {group.label}
              </p>
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectImageItem(item)}
                  className={cn(
                    "group relative flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all cursor-pointer",
                    activeImageId === item.id
                      ? "bg-th-accent-bg text-th-accent-fg ring-1 ring-th-accent-ring"
                      : "text-th-fg-s hover:bg-th-subtle/10"
                  )}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-th-subtle flex items-center justify-center shrink-0">
                      <ImageIcon className="h-4 w-4 text-th-fg-f" />
                    </div>
                  )}
                  <span className="flex-1 min-w-0 line-clamp-2 leading-snug">{item.prompt}</span>

                  {/* Delete button */}
                  <div className="relative mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setDeleteImageId(item.id)}
                      className="rounded-lg p-2 -mr-1 text-th-fg-f transition-all opacity-40 md:opacity-0 md:group-hover:opacity-60 hover:!opacity-100 hover:bg-th-subtle hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

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
