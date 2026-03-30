import { ChevronDown, Loader2 } from "lucide-react";
import { PROVIDER_COLORS } from "@/lib/models";
import type { ModelOption, Mode, ChatStatus } from "@/lib/types";

interface AppHeaderProps {
  mode: Mode;
  selectedModel: ModelOption;
  selectedImageModel: ModelOption;
  isLoading: boolean;
  status: ChatStatus;
  onToggleSidebar: () => void;
}

/** Top bar with provider info, model name, and loading status */
export function AppHeader({
  mode, selectedModel, selectedImageModel,
  isLoading, status, onToggleSidebar,
}: AppHeaderProps) {
  const activeModel = mode === "chat" ? selectedModel : selectedImageModel;

  return (
    <header className="flex items-center justify-between border-b border-slate-700/40 px-4 py-2.5 md:px-6">
      <button
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <div
          className={`h-2 w-2 rounded-full ${PROVIDER_COLORS[activeModel.provider]}`}
        />
        <span>{activeModel.name}</span>
        {isLoading && (
          <span className="ml-2 flex items-center gap-1 text-xs text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            {status === "submitted" ? "Подключение..." : "Генерация..."}
          </span>
        )}
      </div>
      <div className="w-9 md:hidden" />
    </header>
  );
}
