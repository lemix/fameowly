"use client";

import { useState, useCallback } from "react";
import type { MessageData } from "@/lib/types";

interface UseChatMessagesParams {
  activeChatId: string | null;
  persistMessages: (chatId: string, msgs: MessageData[]) => Promise<void>;
  setActiveChatId: (id: string | null) => void;
  setChatSystemPrompt: (prompt: string | undefined) => void;
  activeChatIdRef: React.RefObject<string | null>;
  messagesRef: React.MutableRefObject<MessageData[]>;
}

export function useChatMessages(params: UseChatMessagesParams) {
  const {
    activeChatId,
    persistMessages,
    setActiveChatId,
    setChatSystemPrompt,
    activeChatIdRef,
    messagesRef,
  } = params;

  const [messages, setMessages] = useState<MessageData[]>([]);

  // Keep ref in sync
  messagesRef.current = messages;

  const deleteMessage = useCallback(
    async (messageId: string) => {
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== messageId);
        if (activeChatId) {
          persistMessages(activeChatId, updated);
        }
        return updated;
      });
    },
    [activeChatId, persistMessages]
  );

  const deleteLastExchange = useCallback(() => {
    setMessages((prev) => {
      const updated = [...prev];
      while (
        updated.length > 0 &&
        updated[updated.length - 1].role === "assistant"
      ) {
        updated.pop();
      }
      if (updated.length > 0 && updated[updated.length - 1].role === "user") {
        updated.pop();
      }
      if (activeChatId) persistMessages(activeChatId, updated);
      return updated;
    });
  }, [activeChatId, persistMessages]);

  const clearChat = useCallback(() => {
    messagesRef.current = [];
    activeChatIdRef.current = null;
    setMessages([]);
    setActiveChatId(null);
    setChatSystemPrompt(undefined);
  }, [messagesRef, activeChatIdRef, setActiveChatId, setChatSystemPrompt]);

  return {
    messages,
    setMessages,
    deleteMessage,
    deleteLastExchange,
    clearChat,
  };
}
