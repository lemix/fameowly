"use client";

import { useState, useCallback, useRef } from "react";
import type { MessageData, ChatListItem } from "@/lib/types";

export function useChatApi() {
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatSystemPrompt, setChatSystemPrompt] = useState<string | undefined>(undefined);
  const activeChatIdRef = useRef<string | null>(null);
  const messagesRef = useRef<MessageData[]>([]);
  activeChatIdRef.current = activeChatId;

  const loadChatList = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) { const data = await res.json(); setChatList(data.chats || []); }
    } catch { /* silent */ }
  }, []);

  const loadChat = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats?id=${chatId}`);
      if (res.ok) {
        const data = await res.json();
        const loaded: MessageData[] = data.chat.messages.map(
          (m: MessageData & { createdAt: string }) => ({ ...m, createdAt: new Date(m.createdAt) })
        );
        messagesRef.current = loaded;
        activeChatIdRef.current = chatId;
        return { messages: loaded, chatId, systemPrompt: data.chat.systemPrompt || undefined };
      }
    } catch { /* silent */ }
    return null;
  }, []);

  const createNewChat = useCallback(async (modelId: string, systemPrompt?: string) => {
    try {
      const res = await fetch("/api/chats", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, systemPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        messagesRef.current = [];
        activeChatIdRef.current = data.chat.id;
        setActiveChatId(data.chat.id);
        setChatSystemPrompt(systemPrompt);
        await loadChatList();
        return data.chat.id as string;
      }
    } catch { /* silent */ }
    return null;
  }, [loadChatList]);

  const persistMessages = useCallback(async (chatId: string, msgs: MessageData[]) => {
    try {
      await fetch("/api/chats", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          messages: msgs.map((m) => ({
            id: m.id, role: m.role, content: m.content, reasoning: m.reasoning, attachments: m.attachments,
            createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt || new Date().toISOString(),
          })),
        }),
      });
      await loadChatList();
    } catch { /* silent */ }
  }, [loadChatList]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await fetch("/api/chats", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      });
      if (activeChatIdRef.current === chatId) {
        messagesRef.current = []; activeChatIdRef.current = null; setActiveChatId(null);
      }
      await loadChatList();
    } catch { /* silent */ }
  }, [loadChatList]);

  const renameChat = useCallback(async (chatId: string, title: string) => {
    try {
      await fetch("/api/chats", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, title }),
      });
      await loadChatList();
    } catch { /* silent */ }
  }, [loadChatList]);

  const updateSystemPrompt = useCallback(async (newPrompt: string) => {
    setChatSystemPrompt(newPrompt);
    if (activeChatIdRef.current) {
      try {
        await fetch("/api/chats", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: activeChatIdRef.current, systemPrompt: newPrompt }),
        });
      } catch { /* silent */ }
    }
  }, []);

  return {
    chatList, activeChatId, setActiveChatId, chatSystemPrompt, setChatSystemPrompt,
    loadChatList, loadChat, createNewChat, deleteChat, renameChat, updateSystemPrompt,
    persistMessages, activeChatIdRef, messagesRef,
  };
}
