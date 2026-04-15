import { cn } from "@/lib/utils";
import type { ModelTab } from "./model-list";

interface ModelTabsProps {
  activeTab: ModelTab;
  onTabChange: (tab: ModelTab) => void;
}

export function ModelTabs({ activeTab, onTabChange }: ModelTabsProps) {
  return (
    <div className="flex gap-1 p-1.5 mx-3 mb-1 rounded-xl bg-slate-900/60" data-testid="model-tabs">
      <button
        className={cn(
          "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
          activeTab === "world" ? "bg-slate-700/80 text-white shadow-sm" : "text-slate-400 hover:text-slate-300",
        )}
        onClick={() => onTabChange("world")}
        data-testid="tab-world"
      >
        🌐 Мировые
      </button>
      <button
        className={cn(
          "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
          activeTab === "local" ? "bg-slate-700/80 text-white shadow-sm" : "text-slate-400 hover:text-slate-300",
        )}
        onClick={() => onTabChange("local")}
        data-testid="tab-local"
      >
        🛡️ Fameowly
      </button>
    </div>
  );
}
