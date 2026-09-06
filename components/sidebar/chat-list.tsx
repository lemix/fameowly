"use client";

import type { ChatListItem } from "@/lib/types";
import { useScrollRunway } from "@/hooks/use-scroll-runway";
import { ChatItem } from "./chat-item";

// ─── Types ───────────────────────────────────────────────────────────

interface ChatListProps {
  chats: ChatListItem[];
  activeChatId: string | null;
  searchQuery: string;
  onSelectChat: (chatId: string) => void;
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
  searchQuery,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
}: ChatListProps) {
  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? chats.filter((c) => c.title.toLowerCase().includes(query))
    : chats;
  const groups = groupChatsByDate(filtered);
  const { ref, runway } = useScrollRunway<HTMLDivElement>(filtered);

  return (
    <div
      ref={ref}
      className="flex flex-1 flex-col overflow-y-auto px-[18px]"
      style={{ paddingBottom: runway || 8 }}
    >
      {filtered.length === 0 && (
        <p className="px-[10px] py-8 text-center text-sm text-th-fg-f">
          {query ? "Ничего не найдено" : "Нет чатов. Начните новый!"}
        </p>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          {/* Top padding belongs to the header, not the container: `top-0` pins
              to the padding box and would leave rows visible above it */}
          <div className="sticky top-0 z-20 bg-th-sidebar pt-[20px] pb-[14px] pl-[10px]">
            <p className="text-[16px] font-semibold leading-none text-th-fg">
              {group.label}
            </p>
          </div>
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
      ))}
    </div>
  );
}
