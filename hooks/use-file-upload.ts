"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChatAttachment, PendingAttachment, Mode } from "@/lib/types";

async function uploadFile(file: File): Promise<ChatAttachment | null> {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      return { type: data.type, name: data.name, mimeType: data.mimeType, url: data.url };
    }
  } catch {
    // silent
  }
  return null;
}

export function useFileUpload(mode: Mode) {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [imageRefAttachments, setImageRefAttachments] = useState<PendingAttachment[]>([]);

  const addFiles = useCallback((files: FileList | File[]) => {
    setPendingAttachments((prev) => {
      const remaining = 10 - prev.length;
      if (remaining <= 0) return prev;
      const newPending: PendingAttachment[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
        newPending.push({ file, preview, uploading: true });
      }
      const startIdx = prev.length;
      newPending.forEach(async (pa, idx) => {
        const uploaded = await uploadFile(pa.file);
        setPendingAttachments((current) => {
          const updated = [...current];
          const globalIdx = startIdx + idx;
          if (updated[globalIdx]) {
            updated[globalIdx] = { ...updated[globalIdx], uploading: false, uploaded: uploaded || undefined };
          }
          return updated;
        });
      });
      return [...prev, ...newPending];
    });
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setPendingAttachments((prev) => {
      const updated = [...prev];
      if (updated[idx]?.preview) URL.revokeObjectURL(updated[idx].preview);
      updated.splice(idx, 1);
      return updated;
    });
  }, []);

  const addImageRefFiles = useCallback((files: File[]) => {
    setImageRefAttachments((prev) => {
      const remaining = 10 - prev.length;
      if (remaining <= 0) return prev;
      const filesToAdd = files.slice(0, remaining);
      const newPending: PendingAttachment[] = filesToAdd.map((file) => ({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
        uploading: true,
      }));
      const startIdx = prev.length;
      newPending.forEach(async (pa, idx) => {
        const uploaded = await uploadFile(pa.file);
        setImageRefAttachments((current) => {
          const updated = [...current];
          const globalIdx = startIdx + idx;
          if (updated[globalIdx]) {
            updated[globalIdx] = { ...updated[globalIdx], uploading: false, uploaded: uploaded || undefined };
          }
          return updated;
        });
      });
      return [...prev, ...newPending];
    });
  }, []);

  const removeImageRefAttachment = useCallback((idx: number) => {
    setImageRefAttachments((prev) => {
      const updated = [...prev];
      if (updated[idx]?.preview) URL.revokeObjectURL(updated[idx].preview);
      updated.splice(idx, 1);
      return updated;
    });
  }, []);

  // Paste handler for images (mode-aware)
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        if (mode === "chat") addFiles(imageFiles);
        else addImageRefFiles(imageFiles);
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [mode, addFiles, addImageRefFiles]);

  return {
    pendingAttachments,
    setPendingAttachments,
    imageRefAttachments,
    setImageRefAttachments,
    addFiles,
    removeAttachment,
    addImageRefFiles,
    removeImageRefAttachment,
  };
}
