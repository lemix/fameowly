"use client";

import { useRef } from "react";
import { Loader2, Paperclip, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ASPECT_RATIOS, RESOLUTIONS } from "@/lib/constants/image-options";
import type { PendingAttachment } from "@/lib/types";
import { AspectRatioIcon } from "./aspect-ratio-icon";

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
    <div className="relative px-3 pb-4 pt-2 md:px-4 mb-4 md:mb-6" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
      <div className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />

      <div
        className="mx-auto w-full rounded-2xl bg-slate-800/80 shadow-xl shadow-black/30 ring-1 ring-slate-700/50"
        style={{ maxWidth: "800px" }}
        data-testid="image-input-island"
      >
        {/* Reference files preview */}
        {refAttachments.length > 0 && (
          <div className="px-4 pt-3">
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
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-slate-300 hover:bg-red-500 hover:text-white transition"
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

        {/* Upper zone: clip + textarea + submit */}
        <form onSubmit={onSubmit} className="flex items-end gap-1 px-3 py-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition cursor-pointer hover:text-white hover:bg-slate-700/60"
            title="Прикрепить файлы"
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
            className="flex-1 resize-none bg-transparent px-2 py-2.5 text-base text-white placeholder-slate-500 outline-none"
            style={{ maxHeight: "200px", fontSize: "16px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 200) + "px";
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 transition cursor-pointer hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Создать"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          </button>
        </form>

        {/* Lower zone: aspect ratio chips + resolution chips */}
        <div className="flex flex-col gap-2.5 px-3 pb-3">
          {/* Aspect ratio chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none" data-testid="aspect-ratio-chips">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.id}
                type="button"
                onClick={() => onAspectRatioChange(ar.id)}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition",
                  aspectRatio === ar.id
                    ? "bg-blue-600/25 text-blue-300 ring-1 ring-blue-500/40"
                    : "bg-slate-700/40 text-slate-500 ring-1 ring-slate-700/50 hover:text-slate-300 hover:bg-slate-700/60"
                )}
                data-testid={`aspect-chip-${ar.id}`}
              >
                <AspectRatioIcon type={ar.iconType} active={aspectRatio === ar.id} />
                <span>{ar.label}</span>
              </button>
            ))}
          </div>

          {/* Resolution chips */}
          <div className="flex items-center gap-1.5" data-testid="resolution-chips">
            <span className="text-xs text-slate-500 mr-1">Качество:</span>
            {RESOLUTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onResolutionChange(r.id)}
                className={cn(
                  "flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition",
                  resolution === r.id
                    ? "bg-blue-600/25 text-blue-300 ring-1 ring-blue-500/40"
                    : "bg-slate-700/40 text-slate-500 ring-1 ring-slate-700/50 hover:text-slate-300 hover:bg-slate-700/60"
                )}
                data-testid={`resolution-chip-${r.id}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto mt-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400" style={{ maxWidth: "800px" }}>
          {error}
        </div>
      )}
    </div>
  );
}

