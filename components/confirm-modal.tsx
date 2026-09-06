"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XCircle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Удалить",
  cancelLabel = "Отмена",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  const modal = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4 modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-t-2xl border border-th-border bg-th-panel p-5 shadow-2xl sm:rounded-xl modal-content modal-content-mobile">
        {/* Mobile drag handle */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-th-muted sm:hidden" />
        <div className="mb-3 flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${variant === "danger" ? "bg-red-500/15" : "bg-th-accent-bg"}`}>
            <XCircle className={`h-5 w-5 ${variant === "danger" ? "text-red-400" : "text-th-accent"}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-th-fg">{title}</h3>
            <p className="mt-1 text-xs text-th-fg-m leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="rounded-lg bg-th-subtle px-4 py-2.5 text-xs font-medium text-th-fg-s transition hover:bg-th-muted sm:py-2"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2.5 text-xs font-medium text-white transition sm:py-2 ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-500"
                : "bg-th-accent hover:bg-th-accent-muted"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
