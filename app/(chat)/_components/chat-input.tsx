"use client";

import { useRef } from "react";
import {
  Send, Loader2, Paperclip, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingAttachment } from "@/lib/types";

// ─── Temperature presets ─────────────────────────────────────────────

interface TempPreset {
  id: string;
  label: string;
  icon: string;
  baseTemp: number;
  reasoningTemp: number;
}

const TEMP_PRESETS: TempPreset[] = [
  { id: "precise", label: "Точно", icon: "🎯", baseTemp: 0.2, reasoningTemp: 0.1 },
  { id: "balanced", label: "Баланс", icon: "⚖️", baseTemp: 0.6, reasoningTemp: 0.5 },
  { id: "creative", label: "Творчески", icon: "🎨", baseTemp: 1.0, reasoningTemp: 0.9 },
];

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
  isLocalModel: boolean;
  reasoningEnabled: boolean;
  onReasoningToggle: () => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
}

/** Chat message input with file attachments and local model controls */
export function ChatInput({
  input, onInputChange, onSubmit, onStop, isLoading,
  disabled, disabledPlaceholder,
  pendingAttachments, onAddFiles, onRemoveAttachment,
  isLocalModel, reasoningEnabled, onReasoningToggle,
  temperature, onTemperatureChange,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find closest active preset for current temperature
  const activePresetId = TEMP_PRESETS.reduce((closest, p) => {
    const target = reasoningEnabled ? p.reasoningTemp : p.baseTemp;
    const closestTarget = reasoningEnabled ? closest.reasoningTemp : closest.baseTemp;
    return Math.abs(target - temperature) < Math.abs(closestTarget - temperature)
      ? p : closest;
  }, TEMP_PRESETS[0]).id;

  function handleTempPreset(preset: TempPreset) {
    const temp = reasoningEnabled ? preset.reasoningTemp : preset.baseTemp;
    onTemperatureChange(temp);
  }

  function handleReasoningToggle() {
    onReasoningToggle();
    // Temperature will be adjusted by the parent's handleReasoningToggle
  }

  return (
    <div className="relative px-3 pb-4 pt-2 md:px-4 mb-4 md:mb-6" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
      <div className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />

      <div
        className="mx-auto rounded-2xl bg-slate-800/80 shadow-xl shadow-black/30 ring-1 ring-slate-700/50"
        style={{ maxWidth: "800px" }}
        data-testid="chat-input-island"
      >
        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
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
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-slate-300 hover:bg-red-500 hover:text-white transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upper zone: clip + textarea + send */}
        <form onSubmit={onSubmit} className="flex items-end gap-1 px-3 py-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:text-white hover:bg-slate-700/60 disabled:opacity-40"
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
                e.target.value = "";
              }
            }}
          />

          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={disabled ? (disabledPlaceholder || "Ввод заблокирован") : "Напишите сообщение..."}
            disabled={disabled}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as React.FormEvent);
              }
            }}
            className="flex-1 resize-none bg-transparent px-2 py-2.5 text-base text-white placeholder-slate-500 outline-none disabled:opacity-50"
            style={{ maxHeight: "200px", fontSize: "16px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 200) + "px";
            }}
          />
          <button
            type={isLoading ? "button" : "submit"}
            onClick={isLoading ? onStop : undefined}
            disabled={disabled || (!isLoading && !input.trim() && pendingAttachments.length === 0)}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition",
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

        {/* Lower zone: local model controls */}
        {isLocalModel && (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-0">
            {/* Reasoning pill */}
            <button
              type="button"
              onClick={handleReasoningToggle}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
                reasoningEnabled
                  ? "bg-purple-600/30 text-purple-200 ring-1 ring-purple-500/40"
                  : "bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/50 hover:text-slate-300 hover:bg-slate-700/70"
              )}
              data-testid="reasoning-pill"
            >
              <span>🧠</span>
              <span>Думать</span>
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-slate-700/60" />

            {/* Temperature chips */}
            <div className="flex items-center gap-1.5" data-testid="temperature-chips">
              {TEMP_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleTempPreset(preset)}
                  className={cn(
                    "flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition",
                    activePresetId === preset.id
                      ? "bg-blue-600/25 text-blue-300 ring-1 ring-blue-500/40"
                      : "bg-slate-700/40 text-slate-500 ring-1 ring-slate-700/50 hover:text-slate-400 hover:bg-slate-700/60"
                  )}
                  data-testid={`temp-chip-${preset.id}`}
                >
                  <span>{preset.icon}</span>
                  <span className="hidden sm:inline">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

