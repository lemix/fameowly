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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <h2 className="text-[24px] font-semibold leading-[1.4] text-th-fg">Начнем?</h2>

      {/* System prompt presets */}
      <div className="w-full max-w-2xl px-4">
        <div className="flex flex-wrap justify-center gap-2.5">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset.id);
                onShowPanelChange(preset.id === "custom");
              }}
              data-testid={`preset-${preset.id}`}
              className={cn(
                "rounded-[10px] border px-4 py-2.5 text-sm transition",
                selectedPresetId === preset.id
                  ? "border-transparent bg-th-accent-bg text-th-accent"
                  : "border-th-border bg-th-tab text-th-fg-m hover:text-th-fg"
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
            className="mt-3 w-full resize-none rounded-[10px] border border-th-border bg-th-panel p-4 text-base text-th-fg placeholder-th-fg-f outline-none transition focus:border-th-accent"
            style={{ fontSize: "16px" }}
          />
        )}
      </div>
    </div>
  );
}
