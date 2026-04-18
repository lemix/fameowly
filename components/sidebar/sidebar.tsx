"use client";

import { MessageSquare, ImageIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ChatListItem, Mode, ImageHistoryItemClient } from "@/lib/types";
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
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-th-border/30 bg-th-sidebar transition-transform md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="flex items-center gap-4 px-4 pt-3 pb-6">
          <div className="flex shrink-0 items-center justify-center">
            <Image src="/logo.png" alt="Logo" width={42} height={42} unoptimized className="select-none pointer-events-none" draggable={false} />
          </div>
          <Image src="/fameowly.svg" alt="Fameowly" width={140} height={28} className="h-6 w-auto select-none translate-y-0.5 hidden dark:block" draggable={false} />
          <Image src="/fameowly-light.svg" alt="Fameowly" width={140} height={28} className="h-6 w-auto select-none translate-y-0.5 block dark:hidden" draggable={false} />
        </div>

        {/* Mode Tabs */}
        <div className="px-3 pb-3">
          <div className="flex rounded-lg bg-th-page/80 p-0.5">
            <button
              onClick={() => onModeChange("chat")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition min-h-[44px]",
                mode === "chat" ? "bg-blue-600 text-white shadow" : "text-th-fg-m hover:text-th-fg"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Чат
            </button>
            <button
              onClick={() => onModeChange("image")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition min-h-[44px]",
                mode === "image" ? "bg-blue-600 text-white shadow" : "text-th-fg-m hover:text-th-fg"
              )}
            >
              <ImageIcon className="h-4 w-4" />
              Картинки
            </button>
          </div>
        </div>

        {/* Content area — chat list or image history */}
        {mode === "chat" && (
          <ChatList
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={onSelectChat}
            onNewChat={onNewChat}
            onDeleteChat={onDeleteChat}
            onRenameChat={onRenameChat}
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

