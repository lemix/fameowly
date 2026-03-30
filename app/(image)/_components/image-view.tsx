"use client";

import { Loader2 } from "lucide-react";
import type { ImageHistoryItemClient, PendingAttachment } from "@/lib/types";
import { ConfirmModal } from "@/components/confirm-modal";
import { ImagePreviewModal } from "@/components/image-preview-modal";
import { ImageResult } from "./image-result";
import { ImageEmptyState } from "./image-empty-state";
import { ImageInput } from "./image-input";

interface ImageViewProps {
  selectedItem: ImageHistoryItemClient | null;
  imageLoading: boolean;
  imageError: string;
  imagePrompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  onNewGeneration: () => void;
  // Ref attachments
  refAttachments: PendingAttachment[];
  onAddRefFiles: (files: File[]) => void;
  onRemoveRefAttachment: (idx: number) => void;
  // Settings
  aspectRatio: string;
  onAspectRatioChange: (ar: string) => void;
  resolution: string;
  onResolutionChange: (res: string) => void;
  // Modals
  previewImage: string | null;
  onPreviewChange: (src: string | null) => void;
  confirmDeleteId: string | null;
  onConfirmDeleteChange: (id: string | null) => void;
}

/** Image mode orchestrator — result, empty state, input, modals */
export function ImageView({
  selectedItem, imageLoading, imageError,
  imagePrompt, onPromptChange, onGenerate, onDelete, onNewGeneration,
  refAttachments, onAddRefFiles, onRemoveRefAttachment,
  aspectRatio, onAspectRatioChange, resolution, onResolutionChange,
  previewImage, onPreviewChange, confirmDeleteId, onConfirmDeleteChange,
}: ImageViewProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 md:px-4 md:py-8">
        <div className="mx-auto w-full max-w-xl">
          {/* History view */}
          {selectedItem && selectedItem.imageUrl && (
            <ImageResult
              item={selectedItem}
              onPreview={onPreviewChange}
              onDelete={(id) => onConfirmDeleteChange(id)}
              onNewGeneration={onNewGeneration}
            />
          )}

          {/* Empty state */}
          {!selectedItem && !imageLoading && !imageError && <ImageEmptyState />}

          {/* Loading */}
          {imageLoading && (
            <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
              <p className="text-sm text-slate-400">Генерация изображения...</p>
            </div>
          )}
        </div>
      </div>

      {/* Input — only in generation mode */}
      {!selectedItem && (
        <ImageInput
          prompt={imagePrompt}
          onPromptChange={onPromptChange}
          onSubmit={onGenerate}
          isLoading={imageLoading}
          refAttachments={refAttachments}
          onAddRefFiles={onAddRefFiles}
          onRemoveRefAttachment={onRemoveRefAttachment}
          aspectRatio={aspectRatio}
          onAspectRatioChange={onAspectRatioChange}
          resolution={resolution}
          onResolutionChange={onResolutionChange}
          error={imageError}
        />
      )}

      {/* Preview modal */}
      <ImagePreviewModal
        open={previewImage !== null}
        src={previewImage || ""}
        onClose={() => onPreviewChange(null)}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Удалить изображение?"
        message="Изображение и его история будут удалены без возможности восстановления."
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteId) onDelete(confirmDeleteId);
          onConfirmDeleteChange(null);
        }}
        onCancel={() => onConfirmDeleteChange(null)}
      />
    </div>
  );
}
