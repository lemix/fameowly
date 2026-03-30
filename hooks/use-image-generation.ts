"use client";

import { useState, useCallback } from "react";
import type { ModelOption, PendingAttachment, ImageHistoryItemClient } from "@/lib/types";

interface UseImageGenerationParams {
  selectedImageModel: ModelOption;
  imageRefAttachments: PendingAttachment[];
  setImageRefAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  loadImageHistory: () => Promise<void>;
}

export function useImageGeneration(params: UseImageGenerationParams) {
  const { selectedImageModel, imageRefAttachments, setImageRefAttachments, loadImageHistory } = params;

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageAspectRatio, setImageAspectRatio] = useState("4:3");
  const [imageResolution, setImageResolution] = useState("1K");
  const [selectedImageItem, setSelectedImageItem] = useState<ImageHistoryItemClient | null>(null);
  const [confirmDeleteImageId, setConfirmDeleteImageId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImageGenerate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!imagePrompt.trim()) return;
      setImageLoading(true);
      setImageError("");
      setImageUrl(null);
      setSelectedImageItem(null);

      const refFiles = imageRefAttachments
        .filter((pa) => pa.uploaded)
        .map((pa) => ({
          url: pa.uploaded!.url,
          name: pa.uploaded!.name,
          mimeType: pa.uploaded!.mimeType,
          type: pa.uploaded!.type,
        }));

      try {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: imagePrompt,
            model: selectedImageModel.id,
            referenceFiles: refFiles.length ? refFiles : undefined,
            aspectRatio: imageAspectRatio,
            resolution: imageResolution,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setImageError(data.error || "Ошибка генерации");
        } else {
          setImageUrl(data.imageUrl);
          if (data.historyItem) {
            setSelectedImageItem({ ...data.historyItem, createdAt: new Date(data.historyItem.createdAt) });
          }
        }
      } catch {
        setImageError("Ошибка сети");
      } finally {
        setImageLoading(false);
        setImageRefAttachments([]);
        setImagePrompt("");
        await loadImageHistory();
      }
    },
    [imagePrompt, imageRefAttachments, selectedImageModel, imageAspectRatio, imageResolution, setImageRefAttachments, loadImageHistory]
  );

  const deleteImageHistoryItem = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } catch {
        // ignore
      }
      if (selectedImageItem?.id === id) {
        setSelectedImageItem(null);
        setImageUrl(null);
      }
      await loadImageHistory();
    },
    [selectedImageItem, loadImageHistory]
  );

  return {
    imagePrompt,
    setImagePrompt,
    imageUrl,
    setImageUrl,
    imageLoading,
    imageError,
    setImageError,
    imageAspectRatio,
    setImageAspectRatio,
    imageResolution,
    setImageResolution,
    selectedImageItem,
    setSelectedImageItem,
    confirmDeleteImageId,
    setConfirmDeleteImageId,
    previewImage,
    setPreviewImage,
    handleImageGenerate,
    deleteImageHistoryItem,
  };
}
