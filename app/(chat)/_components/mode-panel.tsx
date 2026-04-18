"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Toast } from "@/components/toast";

// ─── Temperature presets ─────────────────────────────────────────────

interface TempPreset {
  id: string;
  label: string;
  icon: string;
  value: number;
}

const TEMP_PRESETS: TempPreset[] = [
  { id: "precise",  label: "Точно",     icon: "🎯", value: 0.2 },
  { id: "balanced", label: "Баланс",    icon: "⚖️", value: 0.6 },
  { id: "creative", label: "Творчески", icon: "🎨", value: 1.0 },
];

// ─── Props ───────────────────────────────────────────────────────────

interface ModePanelProps {
  isVisible: boolean;
  isKeyboardOpen: boolean;
  supportsTemperature: boolean;
  supportsReasoning: boolean;
  reasoningEnabled: boolean;
  onReasoningToggle: () => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────

/**
 * Floating mode-control panel (reasoning + temperature presets).
 * Positioned absolutely above the chat input island.
 *
 * - Desktop: icon + text label
 * - Mobile: icon only (text hidden via md:inline)
 * - Ultra-compact: smaller sizing when mobile keyboard is open
 */
export function ModePanel({
  isVisible,
  isKeyboardOpen,
  supportsTemperature,
  supportsReasoning,
  reasoningEnabled,
  onReasoningToggle,
  temperature,
  onTemperatureChange,
}: ModePanelProps) {
  const [toast, setToast] = useState<string | null>(null);

  const showControls = supportsTemperature || supportsReasoning;
  if (!showControls) return null;

  const activePresetId = TEMP_PRESETS.reduce(
    (closest, p) =>
      Math.abs(p.value - temperature) < Math.abs(closest.value - temperature)
        ? p
        : closest,
    TEMP_PRESETS[0],
  ).id;

  const handleTempChange = (preset: TempPreset) => {
    onTemperatureChange(preset.value);
    if (window.matchMedia("(max-width: 767px)").matches) {
      setToast(`Режим: ${preset.label}`);
    }
  };

  const handleReasoningToggle = () => {
    onReasoningToggle();
    if (window.matchMedia("(max-width: 767px)").matches) {
      setToast(reasoningEnabled ? "Режим «Думать» выключен" : "Режим «Думать» включён");
    }
  };

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div
        className={cn(
          "absolute bottom-full left-0 right-0 z-10 flex justify-center transition-all duration-300",
          isVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
        style={{ paddingBottom: isKeyboardOpen ? 4 : 8 }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div
          className={cn(
            "flex items-center rounded-full bg-th-panel/90 shadow-lg backdrop-blur-sm ring-1 ring-th-ring/50",
            isKeyboardOpen ? "gap-1 px-1.5 py-0.5" : "gap-1.5 px-2 py-1",
          )}
        >
          {/* Reasoning toggle */}
          {supportsReasoning && (
            <button
              type="button"
              onClick={handleReasoningToggle}
              className={cn(
                "flex items-center rounded-full font-medium transition",
                isKeyboardOpen ? "h-7 gap-1 px-2 text-xs" : "h-9 gap-1.5 px-3 text-sm",
                reasoningEnabled
                  ? "bg-th-purple-bg text-th-purple-fg ring-1 ring-th-purple-muted/40"
                  : "text-th-fg-m hover:text-th-fg-s hover:bg-th-subtle/60",
              )}
              data-testid="reasoning-pill"
            >
              <span className={isKeyboardOpen ? "text-xs" : "text-sm"}>🧠</span>
              <span className="hidden md:inline">Думать</span>
            </button>
          )}

          {/* Separator */}
          {supportsReasoning && supportsTemperature && (
            <div className={cn("w-px bg-th-subtle/60", isKeyboardOpen ? "h-4" : "h-6")} />
          )}

          {/* Temperature chips */}
          {supportsTemperature && (
            <div className="flex items-center gap-1" data-testid="temperature-chips">
              {TEMP_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleTempChange(preset)}
                  className={cn(
                    "flex items-center rounded-full font-medium transition",
                    isKeyboardOpen ? "h-7 gap-1 px-2 text-xs" : "h-9 gap-1.5 px-3 text-sm",
                    activePresetId === preset.id
                      ? "bg-th-accent-bg text-th-accent-fg ring-1 ring-th-accent-ring"
                      : "text-th-fg-f hover:text-th-fg-m hover:bg-th-subtle/60",
                  )}
                  data-testid={`temp-chip-${preset.id}`}
                >
                  <span className={isKeyboardOpen ? "text-xs" : "text-sm"}>{preset.icon}</span>
                  <span className="hidden md:inline">{preset.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
