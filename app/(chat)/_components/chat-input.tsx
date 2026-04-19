"use client";

import { useRef, useEffect } from "react";
import {
  Send, Loader2, Paperclip, X, RefreshCw, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingAttachment } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
  disabledPlaceholder?: string;
  pendingAttachments: PendingAttachment[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (idx: number) => void;
  onRetryAttachment?: (idx: number) => void;
  onFocusChange?: (focused: boolean) => void;
}

/** Chat message input with file attachments and model-specific controls */
export function ChatInput({
  input, onInputChange, onSubmit, onStop, isLoading,
  disabled, disabledPlaceholder,
  pendingAttachments, onAddFiles, onRemoveAttachment, onRetryAttachment,
  onFocusChange,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset textarea height when input is cleared (e.g. after submit)
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  return (
    <div className="relative px-3 pt-2 md:px-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
      <div className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-th-page to-transparent" />

      <div
        className="mx-auto w-full max-w-4xl rounded-2xl bg-th-panel/80 shadow-xl shadow-th-shadow ring-1 ring-th-ring/50"
        data-testid="chat-input-island"
      >
        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {pendingAttachments.map((pa, idx) => (
              <div key={pa.id} className="relative rounded-lg bg-th-subtle/60 p-1">
                {pa.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pa.preview} alt={pa.file.name} className="h-14 w-14 rounded object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded bg-th-subtle text-xs text-th-fg-m">
                    {pa.file.name.slice(0, 8)}
                  </div>
                )}
                {pa.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                )}
                {pa.error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded bg-red-900/70">
                    <AlertCircle className="h-4 w-4 text-red-300" />
                    {onRetryAttachment && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRetryAttachment(idx); }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition"
                        title="Повторить загрузку"
                      >
                        <RefreshCw className="h-3 w-3 text-white" />
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => onRemoveAttachment(idx)}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-th-muted text-th-fg-s hover:bg-red-500 hover:text-white transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upper zone: clip + textarea + send */}
        <form ref={formRef} onSubmit={onSubmit} className="flex items-end gap-1 px-3 py-3">
          <button
            type="button"
            onClick={() => {
              // Reset value before opening to ensure onChange fires for re-selecting the same file
              if (fileInputRef.current) fileInputRef.current.value = "";
              fileInputRef.current?.click();
            }}
            disabled={disabled}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-th-fg-m transition hover:text-th-fg hover:bg-th-subtle/60 disabled:opacity-40"
            title="Прикрепить файл"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.json,.csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                onAddFiles(e.target.files);
              }
            }}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={disabled ? (disabledPlaceholder || "Ввод заблокирован") : "Напишите сообщение..."}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-2.5 text-base text-th-fg placeholder-th-fg-f outline-none disabled:opacity-50"
            style={{ maxHeight: "200px", fontSize: "16px" }}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 200) + "px";
            }}
          />
          <button
            type="button"
            onClick={isLoading ? onStop : () => formRef.current?.requestSubmit()}
            disabled={disabled || (!isLoading && !input.trim() && pendingAttachments.length === 0)}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition",
              isLoading
                ? "bg-red-500 hover:bg-red-400"
                : "bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            title={isLoading ? "Остановить генерацию" : "Отправить"}
          >
            {isLoading ? (
              <div className="h-3.5 w-3.5 rounded-sm bg-white" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

