"use client";

import { Plus, History } from "lucide-react";
import type { ChatListItem } from "@/lib/types";
import { ChatItem } from "./chat-item";

// ─── Types ───────────────────────────────────────────────────────────

interface ChatListProps {
  chats: ChatListItem[];
  activeChatId: string | null;
  showAllChats: boolean;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  onToggleAllChats: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function ChatList({
  chats,
  activeChatId,
  showAllChats,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onToggleAllChats,
}: ChatListProps) {
  const displayedChats = showAllChats ? chats : chats.slice(0, 8);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* New Chat Button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-400 transition hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-600/5"
        >
          <Plus className="h-4 w-4" />
          Новый чат
        </button>
      </div>

      {/* Chat items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {displayedChats.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-slate-500">
            Нет чатов. Начните новый!
          </p>
        )}
        {displayedChats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            onSelect={() => onSelectChat(chat.id)}
            onDelete={() => onDeleteChat(chat.id)}
            onRename={(title) => onRenameChat(chat.id, title)}
          />
        ))}
      </div>

      {/* View All toggle */}
      {chats.length > 8 && (
        <div className="border-t border-slate-700/60 px-3 py-2">
          <button
            onClick={onToggleAllChats}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-slate-400 transition hover:text-slate-200"
          >
            <History className="h-3.5 w-3.5" />
            {showAllChats ? "Показать недавние" : `Все чаты (${chats.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
