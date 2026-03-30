"use client";

import { useRef } from "react";
import { Loader2, Paperclip, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ASPECT_RATIOS, RESOLUTIONS } from "@/lib/constants/image-options";
import type { PendingAttachment } from "@/lib/types";

interface ImageInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  refAttachments: PendingAttachment[];
  onAddRefFiles: (files: File[]) => void;
  onRemoveRefAttachment: (idx: number) => void;
  aspectRatio: string;
  onAspectRatioChange: (ar: string) => void;
  resolution: string;
  onResolutionChange: (res: string) => void;
  error: string;
}

/** Image generation input with ref files, aspect ratio & resolution controls */
export function ImageInput({
  prompt, onPromptChange, onSubmit, isLoading,
  refAttachments, onAddRefFiles, onRemoveRefAttachment,
  aspectRatio, onAspectRatioChange,
  resolution, onResolutionChange, error,
}: ImageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative px-3 pb-4 pt-2 md:px-4">
      <div className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />

      <div className="mx-auto w-full max-w-xl rounded-2xl bg-slate-800/80 shadow-lg shadow-black/20 ring-1 ring-slate-700/50">
        {/* Reference files preview */}
        {refAttachments.length > 0 && (
          <div className="px-3 pt-3">
            <div className="flex flex-wrap gap-2">
              {refAttachments.map((pa, idx) => (
                <div key={idx} className="relative rounded-lg bg-slate-700/60 p-1">
                  {pa.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pa.preview} alt={pa.file.name} className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-700 text-[10px] text-slate-400">
                      {pa.file.name.split(".").pop()?.toUpperCase() || "FILE"}
                    </div>
                  )}
                  {pa.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    </div>
                  )}
                  <button
                    onClick={() => onRemoveRefAttachment(idx)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-slate-300 hover:bg-red-500 hover:text-white transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <span className="mt-1 block text-[10px] text-slate-500">
              Файлы для контекста ({refAttachments.length}/10)
            </span>
          </div>
        )}

        {/* Input row */}
        <form onSubmit={onSubmit} className="flex items-end gap-1 p-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition cursor-pointer hover:text-white hover:bg-slate-700/60"
            title="Прикрепить файлы"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.json,.csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) onAddRefFiles(Array.from(e.target.files));
              e.target.value = "";
            }}
          />

          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Опишите изображение..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as React.FormEvent);
              }
            }}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder-slate-500 outline-none"
            style={{ maxHeight: "140px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = target.scrollHeight + "px";
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 transition cursor-pointer hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Создать"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </button>
        </form>

        {/* Settings row */}
        <div className="flex items-center gap-3 overflow-x-auto px-3 pb-2.5 scrollbar-none">
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex gap-0.5">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => onAspectRatioChange(ar.id)}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition",
                    aspectRatio === ar.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-500 hover:text-white hover:bg-slate-700/60"
                  )}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-3 w-px shrink-0 bg-slate-700/60" />
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex gap-0.5">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onResolutionChange(r.id)}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition",
                    resolution === r.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-500 hover:text-white hover:bg-slate-700/60"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto mt-2 max-w-xl rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
