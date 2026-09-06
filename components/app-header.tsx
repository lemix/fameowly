"use client";

import { Menu, Loader2, Repeat, Sun, Moon, SunMoon } from "lucide-react";
import type { ModelOption, Mode, ChatStatus } from "@/lib/types";
import type { ThemeMode } from "@/hooks/use-theme";
import { useStandaloneMode } from "@/hooks/use-standalone-mode";
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

const iconBtnCls =
  "flex h-6 w-6 items-center justify-center text-th-fg-m transition hover:text-th-fg";

/** Translucent top bar the content scrolls under */
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
  const isStandalone = useStandaloneMode();

  return (
    <header
      className="absolute inset-x-0 top-0 z-20 flex h-[71px] shrink-0 items-center justify-between bg-th-header pl-3 pr-[28px] backdrop-blur-[5px] lg:pl-[31px]"
      data-testid="app-header"
    >
      <div className="flex min-w-0 items-center gap-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-th-fg-m transition hover:text-th-fg lg:hidden"
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>

          {mode !== "video" && (
            <ModelSelector
              models={models}
              selected={activeModel}
              onChange={handleChange}
              modelUnavailable={modelUnavailable}
            />
          )}
        </div>

        <div className="hidden min-w-0 items-center gap-2.5 md:flex">
          {!modelUnavailable && mode !== "video" && activeModel.description && (
            <span className="truncate text-sm text-th-fg-f max-w-[300px] lg:max-w-[400px]">
              - {activeModel.description}
            </span>
          )}

          {isLoading && (
            <span className="flex items-center gap-1 text-xs text-th-accent">
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
      </div>

      <div className="flex shrink-0 items-center gap-5">
        <button
          onClick={onCycleTheme}
          className={iconBtnCls}
          title={`Тема: ${THEME_META[themeMode].label}`}
          data-testid="theme-toggle"
        >
          <ThemeIcon className="h-6 w-6" strokeWidth={1.5} />
        </button>

        {/* A browser tab already has a reload control — only the installed PWA needs one */}
        {isStandalone && (
          <button
            onClick={() => window.location.reload()}
            className={iconBtnCls}
            title="Перезагрузить"
            data-testid="reload-button"
          >
            <Repeat className="h-6 w-6" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </header>
  );
}

