"use client";

import { useCallback } from "react";
import { useChatApi } from "./use-chat-api";
import { useChatMessages } from "./use-chat-messages";
import { useChatStreaming } from "./use-chat-streaming";

export function usePersistentChat() {
  const chatApi = useChatApi();
  const chatMessages = useChatMessages({
    activeChatId: chatApi.activeChatId,
    persistMessages: chatApi.persistMessages,
    setActiveChatId: chatApi.setActiveChatId,
    setChatSystemPrompt: chatApi.setChatSystemPrompt,
    activeChatIdRef: chatApi.activeChatIdRef,
    messagesRef: chatApi.messagesRef,
  });
  const streaming = useChatStreaming({
    messages: chatMessages.messages,
    setMessages: chatMessages.setMessages,
    activeChatIdRef: chatApi.activeChatIdRef,
    messagesRef: chatApi.messagesRef,
    createNewChat: chatApi.createNewChat,
    persistMessages: chatApi.persistMessages,
    chatSystemPrompt: chatApi.chatSystemPrompt,
  });

  // loadChat needs to update messages state from chatMessages
  const loadChat = useCallback(
    async (chatId: string) => {
      const result = await chatApi.loadChat(chatId);
      if (result) {
        chatMessages.setMessages(result.messages);
        chatApi.setActiveChatId(result.chatId);
        chatApi.setChatSystemPrompt(result.systemPrompt);
        streaming.setError(null);
      }
    },
    [chatApi, chatMessages, streaming]
  );

  const clearChat = useCallback(() => {
    chatMessages.clearChat();
    streaming.setError(null);
  }, [chatMessages, streaming]);

  return {
    messages: chatMessages.messages,
    status: streaming.status,
    error: streaming.error,
    activeChatId: chatApi.activeChatId,
    chatList: chatApi.chatList,
    chatSystemPrompt: chatApi.chatSystemPrompt,
    setChatSystemPrompt: chatApi.setChatSystemPrompt,
    sendMessage: streaming.sendMessage,
    stop: streaming.stop,
    retry: streaming.retry,
    deleteMessage: chatMessages.deleteMessage,
    deleteLastExchange: chatMessages.deleteLastExchange,
    clearChat,
    loadChatList: chatApi.loadChatList,
    loadChat,
    createNewChat: chatApi.createNewChat,
    deleteChat: chatApi.deleteChat,
    renameChat: chatApi.renameChat,
    updateSystemPrompt: chatApi.updateSystemPrompt,
  };
}
