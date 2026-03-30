"use client";

import { Bot, MessageSquare, ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption, ChatListItem, Mode, ImageHistoryItemClient } from "@/lib/types";
import { ModelDropdown } from "./model-dropdown";
import { ChatList } from "./chat-list";
import { ImageHistoryList } from "./image-history-list";
import { SidebarFooter } from "./sidebar-footer";

// ─── Types ───────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  chatModels: ModelOption[];
  imageModels: ModelOption[];
  selectedModel: ModelOption;
  onModelChange: (model: ModelOption) => void;
  selectedImageModel: ModelOption;
  onImageModelChange: (model: ModelOption) => void;
  chats: ChatListItem[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  showAllChats: boolean;
  onToggleAllChats: () => void;
  imageHistory: ImageHistoryItemClient[];
  activeImageId: string | null;
  onSelectImageItem: (item: ImageHistoryItemClient) => void;
  onDeleteImageHistory: (id: string) => void;
  onNewImageGeneration: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function Sidebar({
  isOpen,
  onClose,
  mode,
  onModeChange,
  chatModels,
  imageModels,
  selectedModel,
  onModelChange,
  selectedImageModel,
  onImageModelChange,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  showAllChats,
  onToggleAllChats,
  imageHistory,
  activeImageId,
  onSelectImageItem,
  onDeleteImageHistory,
  onNewImageGeneration,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-700/40 bg-slate-850 transition-transform md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "#0d1525" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-700/60 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white">Family AI Hub</span>
        </div>

        {/* Mode Tabs */}
        <div className="border-b border-slate-700/60 px-3 py-2.5">
          <div className="flex rounded-lg bg-slate-900/80 p-0.5">
            <button
              onClick={() => onModeChange("chat")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                mode === "chat" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Чат
            </button>
            <button
              onClick={() => onModeChange("image")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                mode === "image" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Картинки
            </button>
          </div>
        </div>

        {/* Model Selector */}
        <div className="border-b border-slate-700/60 px-3 py-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <Sparkles className="h-3 w-3" />
            {mode === "chat" ? "Модель" : "Модель для картинок"}
          </h3>
          {mode === "chat" ? (
            <ModelDropdown models={chatModels} selected={selectedModel} onChange={onModelChange} />
          ) : (
            <ModelDropdown models={imageModels} selected={selectedImageModel} onChange={onImageModelChange} />
          )}
        </div>

        {/* Content area — chat list or image history */}
        {mode === "chat" && (
          <ChatList
            chats={chats}
            activeChatId={activeChatId}
            showAllChats={showAllChats}
            onSelectChat={onSelectChat}
            onNewChat={onNewChat}
            onDeleteChat={onDeleteChat}
            onRenameChat={onRenameChat}
            onToggleAllChats={onToggleAllChats}
          />
        )}

        {mode === "image" && (
          <ImageHistoryList
            imageHistory={imageHistory}
            activeImageId={activeImageId}
            onSelectImageItem={onSelectImageItem}
            onDeleteImageHistory={onDeleteImageHistory}
            onNewImageGeneration={onNewImageGeneration}
            onClose={onClose}
          />
        )}

        {/* Footer */}
        <SidebarFooter />
      </aside>
    </>
  );
}
