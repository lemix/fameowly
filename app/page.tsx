"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Bot,
  User,
  Settings,
  LogOut,
  ImageIcon,
  MessageSquare,
  Loader2,
  ChevronDown,
  Sparkles,
  Trash2,
  RefreshCw,
  XCircle,
  Brain,
  StopCircle,
} from "lucide-react";
import { AVAILABLE_MODELS, IMAGE_MODELS } from "@/lib/models";
import type { ModelOption } from "@/lib/models";

// ─── Types ───────────────────────────────────────────────────────────

type Mode = "chat" | "image";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  error?: string;
  createdAt: Date;
}

type ChatStatus = "ready" | "submitted" | "streaming" | "error";

// ─── SSE Stream Parser ──────────────────────────────────────────────

async function* parseSSEStream(
  response: Response
): AsyncGenerator<{ type: string; [key: string]: unknown }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        try {
          yield JSON.parse(data);
        } catch {
          // skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Chat Hook ───────────────────────────────────────────────────────

function useChatManual() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string, model: ModelOption) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date(),
      };

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setStatus("submitted");
      setError(null);

      // Build UIMessage format for the API
      const apiMessages = [...messages, userMsg].map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text" as const, text: m.content }],
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            model: model.id,
            provider: model.provider,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error || `Ошибка сервера: ${response.status}`
          );
        }

        if (!response.body) {
          throw new Error("Пустой ответ от сервера");
        }

        // Add assistant message placeholder
        setMessages((prev) => [...prev, { ...assistantMsg }]);
        setStatus("streaming");

        let fullText = "";
        let fullReasoning = "";
        let streamError = "";

        for await (const event of parseSSEStream(response)) {
          if (controller.signal.aborted) break;

          switch (event.type) {
            case "text-delta":
              fullText += event.delta as string;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: fullText,
                  };
                }
                return updated;
              });
              break;

            case "reasoning-delta":
              fullReasoning += event.delta as string;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    reasoning: fullReasoning,
                  };
                }
                return updated;
              });
              break;

            case "error":
              streamError = (event.errorText as string) || "Неизвестная ошибка";
              break;
          }
        }

        if (streamError) {
          setError(streamError);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, error: streamError };
            }
            return updated;
          });
          setStatus("error");
        } else if (!fullText && !controller.signal.aborted) {
          setError("Модель не вернула ответ. Попробуйте повторить запрос.");
          setStatus("error");
        } else {
          setStatus("ready");
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("ready");
          return;
        }
        const message =
          err instanceof Error ? err.message : "Ошибка сети. Проверьте соединение.";
        setError(message);

        // Remove empty assistant message on error
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
        setStatus("error");
      } finally {
        abortRef.current = null;
      }
    },
    [messages]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("ready");
  }, []);

  const retry = useCallback(
    (model: ModelOption) => {
      setError(null);
      // Find the last user message
      const lastUserIdx = messages.findLastIndex((m) => m.role === "user");
      if (lastUserIdx === -1) return;

      const lastUserMsg = messages[lastUserIdx];
      // Remove everything from the last user message onwards
      setMessages(messages.slice(0, lastUserIdx));

      // Resend after state update
      setTimeout(() => {
        sendMessage(lastUserMsg.content, model);
      }, 50);
    },
    [messages, sendMessage]
  );

  const deleteLastExchange = useCallback(() => {
    setError(null);
    setMessages((prev) => {
      const updated = [...prev];
      // Remove last assistant message(s)
      while (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
        updated.pop();
      }
      // Remove last user message
      if (updated.length > 0 && updated[updated.length - 1].role === "user") {
        updated.pop();
      }
      return updated;
    });
    setStatus("ready");
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setStatus("ready");
  }, []);

  return {
    messages,
    status,
    error,
    sendMessage,
    stop,
    retry,
    deleteLastExchange,
    clearChat,
  };
}

// ─── Main Component ──────────────────────────────────────────────────

export default function ChatPage() {
  const [selectedModel, setSelectedModel] = useState<ModelOption>(
    AVAILABLE_MODELS[0]
  );
  const [mode, setMode] = useState<Mode>("chat");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(
    new Set()
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    messages,
    status,
    error: chatError,
    sendMessage,
    stop,
    retry,
    deleteLastExchange,
    clearChat,
  } = useChatManual();

  const isLoading = status === "streaming" || status === "submitted";

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleImageGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!imagePrompt.trim()) return;
    setImageLoading(true);
    setImageError("");
    setImageUrl(null);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          model: IMAGE_MODELS[0].id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImageError(data.error || "Ошибка генерации");
      } else {
        setImageUrl(data.imageUrl);
      }
    } catch {
      setImageError("Ошибка сети");
    } finally {
      setImageLoading(false);
    }
  }

  function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input, selectedModel);
    setInput("");
  }

  function toggleReasoning(messageId: string) {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-700 bg-slate-800 transition-transform md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">Family AI Hub</span>
        </div>

        {/* Mode Switcher */}
        <div className="border-b border-slate-700 p-4">
          <div className="flex rounded-lg bg-slate-900 p-1">
            <button
              onClick={() => setMode("chat")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === "chat"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Чат
            </button>
            <button
              onClick={() => setMode("image")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === "image"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              Картинки
            </button>
          </div>
        </div>

        {/* Model Selector */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Sparkles className="h-3.5 w-3.5" />
            {mode === "chat" ? "Модель чата" : "Модель картинок"}
          </h3>

          {mode === "chat" ? (
            <div className="space-y-1">
              {AVAILABLE_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    selectedModel.id === m.id
                      ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                      : "text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      m.provider === "google"
                        ? "bg-green-400"
                        : "bg-orange-400"
                    }`}
                  />
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-slate-500">
                      {m.provider === "google" ? "Google" : "OpenRouter"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {IMAGE_MODELS.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg bg-blue-600/20 border border-blue-600/30 px-3 py-2.5 text-sm text-blue-400"
                >
                  <div className="h-2 w-2 rounded-full bg-orange-400" />
                  <div className="font-medium">{m.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* Clear Chat */}
          {mode === "chat" && messages.length > 0 && (
            <button
              onClick={clearChat}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-400 transition hover:border-red-500/50 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Очистить чат
            </button>
          )}
        </div>

        {/* Bottom actions */}
        <div className="border-t border-slate-700 p-4 space-y-2">
          <button
            onClick={() => router.push("/admin")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            <Settings className="h-4 w-4" />
            Админ-панель
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3 md:px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div
              className={`h-2 w-2 rounded-full ${
                selectedModel.provider === "google"
                  ? "bg-green-400"
                  : "bg-orange-400"
              }`}
            />
            {mode === "chat" ? selectedModel.name : IMAGE_MODELS[0].name}
            {isLoading && (
              <span className="ml-2 flex items-center gap-1 text-xs text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                {status === "submitted" ? "Подключение..." : "Генерация..."}
              </span>
            )}
          </div>
          <div className="w-9 md:hidden" />
        </header>

        {/* Chat Mode */}
        {mode === "chat" && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
              {messages.length === 0 && !chatError && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20">
                    <Bot className="h-8 w-8 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Привет! Чем могу помочь?
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Выберите модель слева и начните диалог
                    </p>
                  </div>
                </div>
              )}

              <div className="mx-auto max-w-3xl">
                {messages.map((m) => {
                  const isExpanded = expandedReasoning.has(m.id);

                  return (
                    <div
                      key={m.id}
                      className={`mb-6 flex gap-3 ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {m.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 mt-1">
                          <Bot className="h-4 w-4 text-blue-400" />
                        </div>
                      )}
                      <div className="flex max-w-[80%] flex-col gap-2">
                        {/* Reasoning block */}
                        {m.role === "assistant" && m.reasoning && (
                          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5">
                            <button
                              onClick={() => toggleReasoning(m.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-purple-300 hover:text-purple-200 transition"
                            >
                              <Brain className="h-3.5 w-3.5" />
                              <span>Размышления модели</span>
                              <ChevronDown
                                className={`ml-auto h-3.5 w-3.5 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            {isExpanded && (
                              <div className="border-t border-purple-500/20 px-3 py-2 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                                {m.reasoning}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Error on this specific message */}
                        {m.role === "assistant" && m.error && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
                            <div className="flex items-center gap-2 text-xs text-red-400">
                              <XCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>{m.error}</span>
                            </div>
                          </div>
                        )}

                        {/* Message content */}
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            m.role === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-200 border border-slate-700"
                          }`}
                        >
                          {m.role === "assistant" ? (
                            m.content ? (
                              <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {m.content}
                                </ReactMarkdown>
                              </div>
                            ) : isLoading ? (
                              <div className="flex items-center gap-2 text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Генерация ответа...</span>
                              </div>
                            ) : m.error ? null : (
                              <div className="text-slate-500 italic text-xs">
                                Пустой ответ
                              </div>
                            )
                          ) : (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          )}
                        </div>
                      </div>
                      {m.role === "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 mt-1">
                          <User className="h-4 w-4 text-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Thinking indicator */}
                {status === "submitted" && (
                  <div className="mb-6 flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 mt-1">
                      <Bot className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-400">
                      <Brain className="h-4 w-4 text-purple-400 animate-pulse" />
                      <span>Думаю...</span>
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Global error display with retry */}
                {chatError && !isLoading && (
                  <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-400">Ошибка</p>
                        <p className="mt-1 text-xs text-red-300/80 break-words">
                          {chatError}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => retry(selectedModel)}
                        className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/30"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Повторить
                      </button>
                      <button
                        onClick={deleteLastExchange}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Удалить
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-slate-700 px-4 py-4 md:px-8">
              {/* Stop button */}
              {isLoading && (
                <div className="mx-auto mb-3 flex max-w-3xl justify-center">
                  <button
                    onClick={stop}
                    className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
                  >
                    <StopCircle className="h-4 w-4" />
                    Остановить генерацию
                  </button>
                </div>
              )}
              <form
                onSubmit={handleChatSubmit}
                className="mx-auto flex max-w-3xl items-end gap-3"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите сообщение..."
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                  className="flex-1 resize-none rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  style={{ maxHeight: "150px" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = target.scrollHeight + "px";
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}

        {/* Image Mode */}
        {mode === "image" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8">
            <div className="w-full max-w-xl">
              <h2 className="mb-6 text-center text-xl font-semibold">
                <ImageIcon className="mr-2 inline h-6 w-6 text-blue-400" />
                Генерация изображений
              </h2>

              <form onSubmit={handleImageGenerate} className="flex gap-3">
                <input
                  type="text"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Опишите изображение на английском..."
                  className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="submit"
                  disabled={imageLoading || !imagePrompt.trim()}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {imageLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Создать
                </button>
              </form>

              {imageError && (
                <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
                  {imageError}
                </div>
              )}

              {imageUrl && (
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={imagePrompt} className="w-full" />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
