import { Menu, Loader2, RefreshCw } from "lucide-react";
import type { ModelOption, Mode, ChatStatus, UserInfo } from "@/lib/types";
import { ModelSelector } from "./model-selector";

interface AppHeaderProps {
  mode: Mode;
  selectedModel: ModelOption;
  selectedImageModel: ModelOption;
  chatModels: ModelOption[];
  imageModels: ModelOption[];
  onModelChange: (model: ModelOption) => void;
  onImageModelChange: (model: ModelOption) => void;
  isLoading: boolean;
  status: ChatStatus;
  onToggleSidebar: () => void;
  user: UserInfo | null;
  modelUnavailable?: boolean;
}

/** Top bar with model selector, loading status, and reload button */
export function AppHeader({
  mode, selectedModel, selectedImageModel,
  chatModels, imageModels,
  onModelChange, onImageModelChange,
  isLoading, status, onToggleSidebar,
  user, modelUnavailable,
}: AppHeaderProps) {
  const models = mode === "chat" ? chatModels : imageModels;
  const activeModel = mode === "chat" ? selectedModel : selectedImageModel;
  const handleChange = mode === "chat" ? onModelChange : onImageModelChange;

  return (
    <header className="flex items-center justify-between border-b border-slate-700/40 px-3 py-2 md:px-4" data-testid="app-header">
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>

        <ModelSelector
          models={models}
          selected={activeModel}
          onChange={handleChange}
          user={user}
          modelUnavailable={modelUnavailable}
        />

        {isLoading && (
          <span className="ml-1 flex items-center gap-1 text-xs text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="hidden sm:inline">
              {status === "submitted" ? "Подключение..." : "Генерация..."}
            </span>
          </span>
        )}
      </div>

      <button
        onClick={() => window.location.reload()}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
        title="Перезагрузить"
        data-testid="reload-button"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </header>
  );
}

