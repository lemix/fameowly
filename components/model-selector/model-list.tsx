import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption, ModelTier } from "@/lib/types";
import { PriceBadge } from "./price-badge";

export type ModelTab = "world" | "local";

export interface TierGroup {
  tier: ModelTier;
  label: string;
  icon: string;
  models: ModelOption[];
}

interface ModelListProps {
  groups: TierGroup[];
  pick: string;
  onSelect: (model: ModelOption) => void;
}

export function ModelList({ groups, pick, onSelect }: ModelListProps) {
  return (
    <div className="px-3 pb-2" data-testid="model-list">
      {groups.map((group, gi) => (
        <div key={group.tier}>
          <div
            className={cn(
              "px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-widest text-th-fg-f snap-start",
              gi > 0 && "mt-4 border-t border-th-border/40 pt-4",
            )}
          >
            {group.icon} {group.label}
          </div>

          {group.models.map((model) => {
            const isActive = pick === model.id;
            return (
              <button
                key={model.id}
                onClick={() => onSelect(model)}
                data-active={isActive || undefined}
                className={cn(
                  "flex w-full items-center gap-3 px-3 text-left rounded-xl h-[56px]",
                  "transition-all duration-150 active:scale-[0.97] snap-start",
                  isActive ? "bg-th-accent-bg ring-1 ring-th-accent-ring" : "hover:bg-th-subtle/40",
                )}
                data-testid={`model-option-${model.id}`}
              >
                <Sparkles className="h-5 w-5 shrink-0 text-th-fg-m" />
                <span className="flex-1 min-w-0 text-sm font-semibold text-th-fg truncate">
                  {model.name}
                </span>
                <PriceBadge model={model} />
                {isActive && (
                  <Check className="h-4 w-4 shrink-0 text-th-accent" data-testid="model-check-icon" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
