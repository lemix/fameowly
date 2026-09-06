"use client";

import { useRef, useEffect, useState } from "react";
import {
  ArrowRight, Loader2, Plus, X, RefreshCw, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingAttachment } from "@/lib/types";

// ─── Constants ───────────────────────────────────────────────────────

/** Height of a single text line inside the island */
const LINE_H = 20;
const MAX_H = 200;

const ISLAND_SHADOW =
  "shadow-[0_0_4px_0_rgba(0,0,0,0.04),0_8px_16px_0_rgba(0,0,0,0.08)]";

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
  const [multiline, setMultiline] = useState(false);
  const [prevInput, setPrevInput] = useState(input);

  // The parent clears `input` after submit without firing onChange
  if (input !== prevInput) {
    setPrevInput(input);
    if (!input) setMultiline(false);
  }

  // Reset textarea height when input is cleared (e.g. after submit)
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  return (
    <div className="relative px-3 pt-2 md:px-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
      {/* Pending attachments preview — above the island, it cannot fit inside the capsule */}
      {pendingAttachments.length > 0 && (
        <div className="mx-auto mb-2 flex w-full max-w-4xl flex-wrap gap-2 px-2">
          {pendingAttachments.map((pa, idx) => (
            <div key={pa.id} className="relative rounded-lg bg-th-subtle p-1">
              {pa.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pa.preview} alt={pa.file.name} className="h-14 w-14 rounded object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded bg-th-muted text-xs text-th-fg-m">
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
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
                      title="Повторить загрузку"
                    >
                      <RefreshCw className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => onRemoveAttachment(idx)}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-th-muted text-th-fg transition hover:bg-th-red hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={onSubmit}
        data-testid="chat-input-island"
        className={cn(
          "mx-auto flex w-full max-w-4xl items-end gap-[10px] border border-th-border bg-th-panel px-4 py-[15px] transition-[border-radius]",
          ISLAND_SHADOW,
          multiline ? "rounded-[24px]" : "rounded-[50px]"
        )}
      >
        <button
          type="button"
          onClick={() => {
            // Reset value before opening to ensure onChange fires for re-selecting the same file
            if (fileInputRef.current) fileInputRef.current.value = "";
            fileInputRef.current?.click();
          }}
          disabled={disabled}
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center text-th-accent transition hover:opacity-70 disabled:opacity-40"
          title="Прикрепить файл"
        >
          <Plus className="h-6 w-6" strokeWidth={1.5} />
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
          placeholder={disabled ? (disabledPlaceholder || "Ввод заблокирован") : "Спросите Fameowly"}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent py-[5px] leading-[20px] text-th-fg placeholder-th-fg-f outline-none disabled:opacity-50"
          style={{ maxHeight: MAX_H, fontSize: "16px" }}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, MAX_H) + "px";
            setMultiline(target.scrollHeight > LINE_H * 1.5);
          }}
        />
        <button
          type="button"
          onClick={isLoading ? onStop : () => formRef.current?.requestSubmit()}
          disabled={disabled || (!isLoading && !input.trim() && pendingAttachments.length === 0)}
          className={cn(
            "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-white transition",
            isLoading
              ? "bg-th-red hover:opacity-80"
              : "bg-th-accent hover:bg-th-accent-muted disabled:cursor-not-allowed disabled:opacity-40"
          )}
          title={isLoading ? "Остановить генерацию" : "Отправить"}
        >
          {isLoading ? (
            <div className="h-2.5 w-2.5 rounded-[2px] bg-white" />
          ) : (
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
          )}
        </button>
      </form>
    </div>
  );
}

