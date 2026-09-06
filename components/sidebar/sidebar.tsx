"use client";

import { useCallback, useState } from "react";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toast } from "@/components/toast";
import { SIDEBAR_COMPACT_HEIGHT } from "@/lib/constants/breakpoints";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
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
  const { viewportHeight, isKeyboardOpen } = useVisualViewport();

  const isImage = mode === "image";
  const compactFooter = viewportHeight !== null && viewportHeight < SIDEBAR_COMPACT_HEIGHT;
  // `inset-y-0` anchors to the layout viewport, which iOS does not shrink for the keyboard
  const keyboardHeight = isKeyboardOpen && viewportHeight ? `${viewportHeight}px` : undefined;
  // Mode tabs and footer give their space to the results list while searching
  const hideWhileSearching = searchOpen ? "hidden md:flex" : "";

  const resetSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const closeAndReset = useCallback(() => {
    resetSearch();
    onClose();
  }, [resetSearch, onClose]);

  return (
    <>
      {/* Overlay for viewports where the sidebar floats above the content.
          Must outrank the header (z-20) so the header dims and taps close the menu. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={closeAndReset}
          data-testid="sidebar-overlay"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[285px] flex-col border-r border-th-border bg-th-sidebar safe-area-top transition-transform md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ height: keyboardHeight }}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="flex shrink-0 items-start justify-between pl-[23px] pr-5 pt-[24px]">
          <div className="flex h-[34px] items-center">
            <ThemeLogo />
          </div>
          <button
            onClick={closeAndReset}
            aria-label="Скрыть меню"
            className="mt-0.5 text-th-fg-m transition hover:text-th-fg md:hidden"
            data-testid="sidebar-close"
          >
            <PanelLeft className="h-[30px] w-[30px]" strokeWidth={1.5} />
          </button>
        </div>

        <SidebarTabs mode={mode} onModeChange={onModeChange} className={hideWhileSearching} />

        <SidebarNav
          newLabel={isImage ? "Новая генерация" : "Новый чат"}
          onNew={() => {
            if (isImage) onNewImageGeneration();
            else onNewChat();
            closeAndReset();
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
            onSelectImageItem={(item) => {
              resetSearch();
              onSelectImageItem(item);
            }}
            onDeleteImageHistory={onDeleteImageHistory}
          />
        ) : (
          <ChatList
            chats={chats}
            activeChatId={activeChatId}
            searchQuery={mode === "chat" ? searchQuery : ""}
            onSelectChat={(chatId) => {
              resetSearch();
              onSelectChat(chatId);
            }}
            onDeleteChat={onDeleteChat}
            onRenameChat={onRenameChat}
          />
        )}

        <SidebarFooter compact={compactFooter} className={hideWhileSearching} />
      </aside>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

