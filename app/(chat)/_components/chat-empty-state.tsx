import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemPromptPreset } from "@/lib/types";

interface ChatEmptyStateProps {
  presets: SystemPromptPreset[];
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  customSystemPrompt: string;
  onCustomPromptChange: (value: string) => void;
  showPanel: boolean;
  onShowPanelChange: (show: boolean) => void;
}

/** Empty chat screen with greeting and system prompt preset selector */
export function ChatEmptyState({
  presets,
  selectedPresetId,
  onSelectPreset,
  customSystemPrompt,
  onCustomPromptChange,
  showPanel,
  onShowPanelChange,
}: ChatEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20">
        <Bot className="h-7 w-7 text-blue-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">
          Привет! Чем могу помочь?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Выберите режим и начните диалог
        </p>
      </div>

      {/* System prompt presets */}
      <div className="mt-2 w-full max-w-md">
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset.id);
                if (preset.id === "custom") onShowPanelChange(true);
                else onShowPanelChange(false);
              }}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left text-sm transition",
                selectedPresetId === preset.id
                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                  : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
              )}
            >
              {preset.name}
            </button>
          ))}
        </div>
        {showPanel && selectedPresetId === "custom" && (
          <textarea
            value={customSystemPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            placeholder="Введите свой системный промпт..."
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        )}
      </div>
    </div>
  );
}
