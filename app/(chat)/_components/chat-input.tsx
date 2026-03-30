"use client";

import { useRef } from "react";
import {
  Send, Loader2, Paperclip, X, Brain, Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingAttachment } from "@/lib/types";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
  pendingAttachments: PendingAttachment[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (idx: number) => void;
  isLocalModel: boolean;
  reasoningEnabled: boolean;
  onReasoningToggle: () => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
}

/** Chat message input with file attachments and local model controls */
export function ChatInput({
  input, onInputChange, onSubmit, onStop, isLoading,
  pendingAttachments, onAddFiles, onRemoveAttachment,
  isLocalModel, reasoningEnabled, onReasoningToggle,
  temperature, onTemperatureChange,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="safe-area-bottom relative px-3 pb-4 pt-2 md:px-4">
      <div className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />

      <div
        className="mx-auto rounded-2xl bg-slate-800/80 shadow-lg shadow-black/20 ring-1 ring-slate-700/50"
        style={{ maxWidth: "52rem" }}
      >
        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {pendingAttachments.map((pa, idx) => (
              <div key={idx} className="relative rounded-lg bg-slate-700/60 p-1">
                {pa.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pa.preview} alt={pa.file.name} className="h-14 w-14 rounded object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded bg-slate-700 text-xs text-slate-400">
                    {pa.file.name.slice(0, 8)}
                  </div>
                )}
                {pa.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                )}
                <button
                  onClick={() => onRemoveAttachment(idx)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-slate-300 hover:bg-red-500 hover:text-white transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-end gap-1 p-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:text-white hover:bg-slate-700/60"
            title="Прикрепить файл"
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
              if (e.target.files?.length) {
                onAddFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />

          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Напишите сообщение..."
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
            type={isLoading ? "button" : "submit"}
            onClick={isLoading ? onStop : undefined}
            disabled={!isLoading && !input.trim() && pendingAttachments.length === 0}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
              isLoading
                ? "bg-red-500 hover:bg-red-400"
                : "bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            title={isLoading ? "Остановить генерацию" : "Отправить"}
          >
            {isLoading ? (
              <div className="h-3.5 w-3.5 rounded-sm bg-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>

        {/* Local model controls */}
        {isLocalModel && (
          <div className="flex items-center gap-3 overflow-x-auto px-3 pb-2.5 scrollbar-none">
            <button
              type="button"
              onClick={onReasoningToggle}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition",
                reasoningEnabled
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "bg-slate-700/40 text-slate-500 border border-slate-700/50 hover:text-slate-400"
              )}
            >
              <Brain className="h-3 w-3" />
              <span>Reasoning</span>
              <span className={cn(
                "ml-0.5 rounded px-1 py-px text-[9px] font-bold uppercase",
                reasoningEnabled ? "bg-purple-500/30 text-purple-200" : "bg-slate-600/50 text-slate-500"
              )}>
                {reasoningEnabled ? "ON" : "OFF"}
              </span>
            </button>

            <div className="h-3 w-px shrink-0 bg-slate-700/60" />

            <div className="flex shrink-0 items-center gap-2">
              <Thermometer className="h-3 w-3 text-slate-500" />
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={temperature}
                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-slate-700 accent-blue-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
              />
              <span className="min-w-[2rem] text-[10px] text-slate-500 tabular-nums">
                {temperature.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
