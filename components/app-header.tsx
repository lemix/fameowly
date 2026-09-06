import { Menu, Loader2, RefreshCw, Sun, Moon, SunMoon } from "lucide-react";
import type { ModelOption, Mode, ChatStatus } from "@/lib/types";
import type { ThemeMode } from "@/hooks/use-theme";
import { ModelSelector } from "./model-selector";
import { ChatTokenBadge } from "./chat-token-badge";
import { PluginSlot } from "@/lib/plugin-ui";

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
  modelUnavailable?: boolean;
  themeMode: ThemeMode;
  onCycleTheme: () => void;
  chatId?: string | null;
}

const THEME_META: Record<ThemeMode, { icon: typeof Sun; label: string }> = {
  auto: { icon: SunMoon, label: "Авто" },
  light: { icon: Sun, label: "Светлая" },
  dark: { icon: Moon, label: "Тёмная" },
};

/** Top bar with model selector, loading status, theme toggle and reload button */
export function AppHeader({
  mode, selectedModel, selectedImageModel,
  chatModels, imageModels,
  onModelChange, onImageModelChange,
  isLoading, status, onToggleSidebar,
  modelUnavailable,
  themeMode, onCycleTheme,
  chatId,
}: AppHeaderProps) {
  const models = mode === "chat" ? chatModels : imageModels;
  const activeModel = mode === "chat" ? selectedModel : selectedImageModel;
  const handleChange = mode === "chat" ? onModelChange : onImageModelChange;
  const ThemeIcon = THEME_META[themeMode].icon;

  return (
    <header className="flex items-center justify-between border-b border-th-border/40 px-3 pt-3 pb-3 shrink-0" data-testid="app-header">
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleSidebar}
          className="flex h-10 pr-3 items-center justify-center rounded-lg text-th-fg-m transition hover:bg-th-panel hover:text-th-fg md:hidden"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>

        <ModelSelector
          models={models}
          selected={activeModel}
          onChange={handleChange}
          modelUnavailable={modelUnavailable}
        />

        {!modelUnavailable && activeModel.description && (
          <span className="hidden md:inline text-sm px-1 text-th-fg-f truncate max-w-[300px] lg:max-w-[400px]">
            — <span className="px-1">{activeModel.description}</span>
          </span>
        )}

        {isLoading && (
          <span className="ml-1 flex items-center gap-1 text-xs text-th-accent">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="hidden sm:inline">
              {status === "submitted" ? "Подключение..." : "Генерация..."}
            </span>
          </span>
        )}

        {mode === "chat" && (
          <PluginSlot
            id="chat-usage"
            props={{ chatId: chatId ?? null, status }}
            fallback={<ChatTokenBadge chatId={chatId ?? null} status={status} />}
          />
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onCycleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-th-fg-f transition hover:bg-th-panel hover:text-th-fg-s"
          title={`Тема: ${THEME_META[themeMode].label}`}
          data-testid="theme-toggle"
        >
          <ThemeIcon className="h-4 w-4" />
        </button>

        <button
          onClick={() => window.location.reload()}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-th-fg-f transition hover:bg-th-panel hover:text-th-fg-s"
          title="Перезагрузить"
          data-testid="reload-button"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

