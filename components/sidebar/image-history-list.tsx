"use client";

import { useState } from "react";
import { Plus, History, ImageIcon, Trash2 } from "lucide-react";
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* New generation button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => { onNewImageGeneration(); onClose(); }}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-400 transition hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-600/5"
        >
          <Plus className="h-4 w-4" />
          Новая генерация
        </button>
      </div>

      <div className="px-3 pt-2 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
          <History className="h-3 w-3" />
          История генераций
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {imageHistory.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-slate-500">
            Нет сгенерированных изображений
          </p>
        )}
        {imageHistory.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectImageItem(item)}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition cursor-pointer",
              activeImageId === item.id
                ? "bg-blue-600/15 text-blue-400 border border-blue-600/25"
                : "hover:bg-slate-700/40"
            )}
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded bg-slate-700 flex items-center justify-center shrink-0">
                <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-300 truncate">{item.prompt}</p>
              <p className="text-[10px] text-slate-500">{item.modelName}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteImageId(item.id); }}
              className="rounded p-1 text-slate-400 opacity-60 hover:opacity-100 hover:text-red-400 hover:bg-slate-700 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
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
