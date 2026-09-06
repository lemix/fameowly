"use client";

import { useState } from "react";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toast } from "@/components/toast";
import { ThemeLogo } from "./theme-logo";
import type { ChatListItem, Mode, ImageHistoryItemClient } from "@/lib/types";
import { SidebarTabs } from "./sidebar-tabs";
import { SidebarNav } from "./sidebar-nav";
import { ChatList } from "./chat-list";
import { ImageHistoryList } from "./image-history-list";
import { SidebarFooter } from "./sidebar-footer";

// ─── Types ───────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  chats: ChatListItem[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
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
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  imageHistory,
  activeImageId,
  onSelectImageItem,
  onDeleteImageHistory,
  onNewImageGeneration,
}: SidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const isImage = mode === "image";

  return (
    <>
      {/* Overlay for viewports where the sidebar floats above the content */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-[1px] lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-[285px] flex-col border-r border-th-border bg-th-sidebar safe-area-top transition-transform lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="flex shrink-0 items-start justify-between pl-[23px] pr-5 pt-[24px]">
          <div className="flex h-[34px] items-center">
            <ThemeLogo />
          </div>
          <button
            onClick={onClose}
            aria-label="Скрыть меню"
            className="mt-0.5 text-th-fg-m transition hover:text-th-fg lg:hidden"
            data-testid="sidebar-close"
          >
            <PanelLeft className="h-[30px] w-[30px]" strokeWidth={1.5} />
          </button>
        </div>

        <SidebarTabs mode={mode} onModeChange={onModeChange} />

        <SidebarNav
          newLabel={isImage ? "Новая генерация" : "Новый чат"}
          onNew={() => {
            if (isImage) onNewImageGeneration();
            else onNewChat();
            onClose();
          }}
          searchOpen={searchOpen}
          onSearchOpenChange={setSearchOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onFolders={() => setToast("Папки скоро появятся")}
        />

        {/* Content area — chat list or image history */}
        {mode === "image" ? (
          <ImageHistoryList
            imageHistory={imageHistory}
            activeImageId={activeImageId}
            searchQuery={searchQuery}
            onSelectImageItem={onSelectImageItem}
            onDeleteImageHistory={onDeleteImageHistory}
          />
        ) : (
          <ChatList
            chats={chats}
            activeChatId={activeChatId}
            searchQuery={mode === "chat" ? searchQuery : ""}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            onRenameChat={onRenameChat}
          />
        )}

        <SidebarFooter />
      </aside>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

