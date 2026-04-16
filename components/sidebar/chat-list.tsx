"use client";

import { Plus } from "lucide-react";
import type { ChatListItem } from "@/lib/types";
import { ChatItem } from "./chat-item";

// ─── Types ───────────────────────────────────────────────────────────

interface ChatListProps {
  chats: ChatListItem[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
}

// ─── Date Grouping ──────────────────────────────────────────────────

interface DateGroup {
  label: string;
  chats: ChatListItem[];
}

function groupChatsByDate(chats: ChatListItem[]): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    today: [] as ChatListItem[],
    yesterday: [] as ChatListItem[],
    week: [] as ChatListItem[],
    older: [] as ChatListItem[],
  };

  for (const chat of chats) {
    const d = new Date(chat.lastMessageAt || chat.updatedAt);
    if (d >= today) groups.today.push(chat);
    else if (d >= yesterday) groups.yesterday.push(chat);
    else if (d >= weekAgo) groups.week.push(chat);
    else groups.older.push(chat);
  }

  const result: DateGroup[] = [];
  if (groups.today.length) result.push({ label: "Сегодня", chats: groups.today });
  if (groups.yesterday.length) result.push({ label: "Вчера", chats: groups.yesterday });
  if (groups.week.length) result.push({ label: "Предыдущие 7 дней", chats: groups.week });
  if (groups.older.length) result.push({ label: "Ранее", chats: groups.older });

  return result;
}

// ─── Component ───────────────────────────────────────────────────────

export function ChatList({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
}: ChatListProps) {
  const groups = groupChatsByDate(chats);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* New Chat Button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600/10 border border-blue-500/20 px-4 py-3 text-sm font-medium text-blue-400 transition-all hover:bg-blue-600/20 hover:border-blue-500/30 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Новый чат
        </button>
      </div>

      {/* Chat items grouped by date */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {chats.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-slate-500">
            Нет чатов. Начните новый!
          </p>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <div className="sticky top-0 z-10 bg-[#0d1525] px-1 pb-1.5 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
            </div>
            <div className="space-y-0.5">
              {group.chats.map((chat) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}
