"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ChatAttachment, PendingAttachment, Mode } from "@/lib/types";

let nextId = 1;
function genId(): string {
  return `pa-${Date.now()}-${nextId++}`;
}

const UPLOAD_TIMEOUT_MS = 30_000;

async function uploadFile(file: File, signal?: AbortSignal): Promise<ChatAttachment | null> {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: formData, signal });
    if (res.ok) {
      const data = await res.json();
      return { type: data.type, name: data.name, mimeType: data.mimeType, url: data.url };
    }
  } catch {
    // network error or abort
  }
  return null;
}

function updateById(
  setter: React.Dispatch<React.SetStateAction<PendingAttachment[]>>,
  id: string,
  patch: Partial<PendingAttachment>,
) {
  setter((prev) => prev.map((pa) => (pa.id === id ? { ...pa, ...patch } : pa)));
}

export function useFileUpload(mode: Mode) {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [imageRefAttachments, setImageRefAttachments] = useState<PendingAttachment[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Cleanup abort controllers on unmount
  useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      controllers.forEach((c) => c.abort());
      controllers.clear();
    };
  }, []);

  const uploadAndTrack = useCallback(
    (
      items: PendingAttachment[],
      setter: React.Dispatch<React.SetStateAction<PendingAttachment[]>>,
    ) => {
      for (const item of items) {
        const controller = new AbortController();
        abortControllersRef.current.set(item.id, controller);

        const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

        uploadFile(item.file, controller.signal)
          .then((uploaded) => {
            clearTimeout(timer);
            abortControllersRef.current.delete(item.id);
            if (uploaded) {
              updateById(setter, item.id, { uploading: false, uploaded });
            } else {
              updateById(setter, item.id, { uploading: false, error: true });
            }
          })
          .catch(() => {
            clearTimeout(timer);
            abortControllersRef.current.delete(item.id);
            updateById(setter, item.id, { uploading: false, error: true });
          });
      }
    },
    [],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setPendingAttachments((prev) => {
        const remaining = 10 - prev.length;
        if (remaining <= 0) return prev;

        const newItems: PendingAttachment[] = Array.from(files)
          .slice(0, remaining)
          .map((file) => ({
            id: genId(),
            file,
            preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
            uploading: true,
          }));

        // Schedule uploads outside of setState via microtask
        Promise.resolve().then(() => uploadAndTrack(newItems, setPendingAttachments));

        return [...prev, ...newItems];
      });
    },
    [uploadAndTrack],
  );

  const removeAttachment = useCallback((idx: number) => {
    setPendingAttachments((prev) => {
      const item = prev[idx];
      if (!item) return prev;
      if (item.preview) URL.revokeObjectURL(item.preview);
      const controller = abortControllersRef.current.get(item.id);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(item.id);
      }
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const retryAttachment = useCallback((idx: number) => {
    setPendingAttachments((prev) => {
      const item = prev[idx];
      if (!item || !item.error) return prev;
      const updated = prev.map((pa, i) =>
        i === idx ? { ...pa, uploading: true, error: undefined } : pa,
      );
      Promise.resolve().then(() =>
        uploadAndTrack([{ ...updated[idx] }], setPendingAttachments),
      );
      return updated;
    });
  }, [uploadAndTrack]);

  const addImageRefFiles = useCallback(
    (files: File[]) => {
      setImageRefAttachments((prev) => {
        const remaining = 10 - prev.length;
        if (remaining <= 0) return prev;

        const newItems: PendingAttachment[] = files.slice(0, remaining).map((file) => ({
          id: genId(),
          file,
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
          uploading: true,
        }));

        Promise.resolve().then(() => uploadAndTrack(newItems, setImageRefAttachments));
        return [...prev, ...newItems];
      });
    },
    [uploadAndTrack],
  );

  const removeImageRefAttachment = useCallback((idx: number) => {
    setImageRefAttachments((prev) => {
      const item = prev[idx];
      if (!item) return prev;
      if (item.preview) URL.revokeObjectURL(item.preview);
      const controller = abortControllersRef.current.get(item.id);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(item.id);
      }
      return prev.filter((_, i) => i !== idx);
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
    retryAttachment,
    addImageRefFiles,
    removeImageRefAttachment,
  };
}
