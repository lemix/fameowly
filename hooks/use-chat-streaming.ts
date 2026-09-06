"use client";

import { useState, useCallback, useRef } from "react";
import type { MessageData, ChatAttachment, ChatStatus, ModelOption } from "@/lib/types";
import { parseSSEStream } from "@/lib/sse-parser";
import { buildApiMessages, processStreamEvent } from "./streaming-helpers";

interface UseChatStreamingParams {
  messages: MessageData[];
  setMessages: React.Dispatch<React.SetStateAction<MessageData[]>>;
  activeChatIdRef: React.RefObject<string | null>;
  messagesRef: React.MutableRefObject<MessageData[]>;
  createNewChat: (modelId: string, systemPrompt?: string) => Promise<string | null>;
  persistMessages: (chatId: string, msgs: MessageData[]) => Promise<void>;
  chatSystemPrompt: string | undefined;
}

export function useChatStreaming(params: UseChatStreamingParams) {
  const { setMessages, activeChatIdRef, messagesRef, createNewChat, persistMessages, chatSystemPrompt } = params;
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    text: string, model: ModelOption, attachments?: ChatAttachment[],
    systemPrompt?: string, localOptions?: { temperature?: number; reasoningEnabled?: boolean }
  ) => {
    let chatId = activeChatIdRef.current;
    if (!chatId) { chatId = await createNewChat(model.id, systemPrompt); if (!chatId) return; }

    const userMsg: MessageData = {
      id: `user-${Date.now()}`, role: "user", content: text,
      attachments: attachments?.length ? attachments : undefined, createdAt: new Date(),
    };
    const assistantMsg: MessageData = { id: `assistant-${Date.now()}`, role: "assistant", content: "", createdAt: new Date() };

    setMessages((prev) => [...prev, userMsg]);
    setStatus("submitted"); setError(null);

    const allMsgs = [...messagesRef.current, userMsg];

    // BUG-04: Persist user message immediately (before API call).
    // Ensures the chat is saved even if the AI never responds or user closes the tab.
    await persistMessages(chatId, allMsgs);

    // Accumulator declared outside try so it's accessible in catch (abort case)
    const acc = { text: "", reasoning: "", error: "" };
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: buildApiMessages(allMsgs), model: model.id, provider: model.provider,
          systemPrompt: systemPrompt || chatSystemPrompt, chatId,
          assistantMessageId: assistantMsg.id,
          ...(localOptions ? { temperature: localOptions.temperature, reasoningEnabled: localOptions.reasoningEnabled } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Ошибка сервера: ${response.status}`);
      }
      if (!response.body) throw new Error("Пустой ответ от сервера");

      setMessages((prev) => [...prev, { ...assistantMsg }]);
      setStatus("streaming");

      for await (const event of parseSSEStream(response)) {
        if (controller.signal.aborted) break;
        processStreamEvent(event, acc, setMessages);
      }

      if (acc.error) {
        setError(acc.error);
        setMessages((prev) => {
          const updated = [...prev]; const last = updated[updated.length - 1];
          if (last?.role === "assistant") updated[updated.length - 1] = { ...last, error: acc.error };
          return updated;
        });
        setStatus("error");
      } else if (!acc.text && !controller.signal.aborted) {
        setError("Модель не вернула ответ. Попробуйте повторить запрос."); setStatus("error");
      } else { setStatus("ready"); }

      // Persist final messages including AI response
      const finalMessages = [...allMsgs, {
        ...assistantMsg, content: acc.text, reasoning: acc.reasoning || undefined, error: acc.error || undefined,
      }];
      await persistMessages(chatId, finalMessages);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Persist partial AI response if any content was received during streaming
        if (acc.text) {
          const partialMessages = [...allMsgs, {
            ...assistantMsg, content: acc.text, reasoning: acc.reasoning || undefined,
          }];
          await persistMessages(chatId, partialMessages);
        }
        setStatus("ready"); return;
      }
      const message = err instanceof Error ? err.message : "Ошибка сети. Проверьте соединение.";
      setError(message);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
        return prev;
      });
      setStatus("error");
    } finally { abortRef.current = null; }
  }, [activeChatIdRef, messagesRef, createNewChat, persistMessages, chatSystemPrompt, setMessages]);

  const stop = useCallback(() => { abortRef.current?.abort(); setStatus("ready"); }, []);

  const retry = useCallback((model: ModelOption, localOptions?: { temperature?: number; reasoningEnabled?: boolean }) => {
    setError(null);
    const currentMsgs = messagesRef.current;
    const lastUserIdx = currentMsgs.findLastIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const lastUserMsg = currentMsgs[lastUserIdx];
    const trimmed = currentMsgs.slice(0, lastUserIdx);
    messagesRef.current = trimmed; setMessages(trimmed);
    sendMessage(lastUserMsg.content, model, lastUserMsg.attachments, undefined, localOptions);
  }, [messagesRef, setMessages, sendMessage]);

  return { status, error, setError, sendMessage, stop, retry };
}
