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
      <div className="mt-4 w-full max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset.id);
                if (preset.id === "custom") onShowPanelChange(true);
                else onShowPanelChange(false);
              }}
              data-testid={`preset-${preset.id}`}
              className={cn(
                "flex items-center rounded-xl border px-4 py-3 text-left text-sm font-medium transition min-h-[3.5rem]",
                selectedPresetId === preset.id
                  ? "border-blue-500 bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30"
                  : "border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-500/60 hover:text-slate-300 hover:bg-slate-800/80"
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
            data-testid="custom-prompt-textarea"
            className="mt-3 w-full resize-none rounded-xl border border-slate-600 bg-slate-800 p-4 text-base text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            style={{ fontSize: "16px" }}
          />
        )}
      </div>
    </div>
  );
}
