"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Send,
  Bot,
  Loader2,
  ChevronDown,
  Sparkles,
  Trash2,
  RefreshCw,
  XCircle,
  Brain,
  ImageIcon,
  Paperclip,
  X,
  Download,
  Pencil,
  Check,
  Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AVAILABLE_MODELS, IMAGE_MODELS, PROVIDER_COLORS } from "@/lib/models";
import type { ModelOption, ModelsConfig } from "@/lib/types";
import type { ChatListItem, ChatAttachment } from "@/lib/types";
import type { MessageData, ChatStatus, Mode, PendingAttachment, ImageHistoryItemClient } from "@/lib/types";
import { SYSTEM_PROMPT_PRESETS } from "@/lib/constants/system-prompts";
import { ASPECT_RATIOS, RESOLUTIONS } from "@/lib/constants/image-options";
import { parseSSEStream } from "@/lib/sse-parser";
import ChatMessage from "@/components/chat-message";
import Sidebar from "@/components/sidebar";
import { ConfirmModal } from "@/components/confirm-modal";
import { ImagePreviewModal } from "@/components/image-preview-modal";

// Types, constants, and SSE parser imported from lib/

// ─── Chat Hook with Persistence ──────────────────────────────────────

function usePersistentChat() {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [chatSystemPrompt, setChatSystemPrompt] = useState<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<MessageData[]>([]);
  const activeChatIdRef = useRef<string | null>(null);

  // Keep refs in sync — prevents stale closures in async callbacks
  messagesRef.current = messages;
  activeChatIdRef.current = activeChatId;

  // Load chat list
  const loadChatList = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setChatList(data.chats || []);
      }
    } catch {
      // silent
    }
  }, []);

  // Load a specific chat
  const loadChat = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats?id=${chatId}`);
      if (res.ok) {
        const data = await res.json();
        const chat = data.chat;
        const loaded: MessageData[] = chat.messages.map(
          (m: MessageData & { createdAt: string }) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          })
        );
        // Update refs BEFORE state — prevents stale reads if sendMessage fires immediately
        messagesRef.current = loaded;
        activeChatIdRef.current = chatId;
        setMessages(loaded);
        setActiveChatId(chatId);
        setChatSystemPrompt(chat.systemPrompt || undefined);
        setError(null);
        setStatus("ready");
      }
    } catch {
      // silent
    }
  }, []);

  // Create new chat
  const createNewChat = useCallback(
    async (modelId: string, systemPrompt?: string) => {
      try {
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId, systemPrompt }),
        });
        if (res.ok) {
          const data = await res.json();
          // Update refs BEFORE state
          messagesRef.current = [];
          activeChatIdRef.current = data.chat.id;
          setActiveChatId(data.chat.id);
          setMessages([]);
          setChatSystemPrompt(systemPrompt);
          setError(null);
          setStatus("ready");
          await loadChatList();
          return data.chat.id as string;
        }
      } catch {
        // silent
      }
      return null;
    },
    [loadChatList]
  );

  // Persist messages to storage
  const persistMessages = useCallback(
    async (chatId: string, msgs: MessageData[]) => {
      try {
        await fetch("/api/chats", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            messages: msgs.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              reasoning: m.reasoning,
              attachments: m.attachments,
              createdAt:
                m.createdAt instanceof Date
                  ? m.createdAt.toISOString()
                  : m.createdAt || new Date().toISOString(),
            })),
          }),
        });
        await loadChatList();
      } catch {
        // silent
      }
    },
    [loadChatList]
  );

  // Send message
  const sendMessage = useCallback(
    async (
      text: string,
      model: ModelOption,
      attachments?: ChatAttachment[],
      systemPrompt?: string,
      localOptions?: { temperature?: number; reasoningEnabled?: boolean }
    ) => {
      let chatId = activeChatIdRef.current;

      // Create chat if none active
      if (!chatId) {
        chatId = await createNewChat(model.id, systemPrompt);
        if (!chatId) return;
      }

      const userMsg: MessageData = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        attachments: attachments?.length ? attachments : undefined,
        createdAt: new Date(),
      };

      const assistantMsg: MessageData = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setStatus("submitted");
      setError(null);

      // Build API messages from ref (not stale closure)
      const currentMessages = messagesRef.current;
      const allMsgs = [...currentMessages, userMsg];
      const apiMessages = allMsgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        attachments: m.attachments,
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
            systemPrompt: systemPrompt || chatSystemPrompt,
            ...(model.provider === "local" && localOptions ? {
              temperature: localOptions.temperature,
              reasoningEnabled: localOptions.reasoningEnabled,
            } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error || `Ошибка сервера: ${response.status}`
          );
        }

        if (!response.body) throw new Error("Пустой ответ от сервера");

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
                  updated[updated.length - 1] = { ...last, content: fullText };
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
              streamError =
                (event.errorText as string) || "Неизвестная ошибка";
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

        // Persist all messages including new ones
        const finalMessages = [
          ...allMsgs,
          {
            ...assistantMsg,
            content: fullText,
            reasoning: fullReasoning || undefined,
            error: streamError || undefined,
          },
        ];
        await persistMessages(chatId, finalMessages);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("ready");
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : "Ошибка сети. Проверьте соединение.";
        setError(message);
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
    [createNewChat, persistMessages, chatSystemPrompt]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("ready");
  }, []);

  const retry = useCallback(
    (
      model: ModelOption,
      localOptions?: { temperature?: number; reasoningEnabled?: boolean }
    ) => {
      setError(null);
      const currentMsgs = messagesRef.current;
      const lastUserIdx = currentMsgs.findLastIndex((m) => m.role === "user");
      if (lastUserIdx === -1) return;
      const lastUserMsg = currentMsgs[lastUserIdx];
      const trimmed = currentMsgs.slice(0, lastUserIdx);
      // Update ref immediately so sendMessage reads clean state
      messagesRef.current = trimmed;
      setMessages(trimmed);
      sendMessage(
        lastUserMsg.content,
        model,
        lastUserMsg.attachments,
        undefined,
        localOptions
      );
    },
    [sendMessage]
  );

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
    setError(null);
    setMessages((prev) => {
      const updated = [...prev];
      while (
        updated.length > 0 &&
        updated[updated.length - 1].role === "assistant"
      ) {
        updated.pop();
      }
      if (
        updated.length > 0 &&
        updated[updated.length - 1].role === "user"
      ) {
        updated.pop();
      }
      if (activeChatId) persistMessages(activeChatId, updated);
      return updated;
    });
    setStatus("ready");
  }, [activeChatId, persistMessages]);

  const clearChat = useCallback(() => {
    messagesRef.current = [];
    activeChatIdRef.current = null;
    setMessages([]);
    setActiveChatId(null);
    setChatSystemPrompt(undefined);
    setError(null);
    setStatus("ready");
  }, []);

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        await fetch("/api/chats", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId }),
        });
        if (activeChatIdRef.current === chatId) {
          messagesRef.current = [];
          activeChatIdRef.current = null;
          setMessages([]);
          setActiveChatId(null);
          setError(null);
        }
        await loadChatList();
      } catch {
        // silent
      }
    },
    [loadChatList]
  );

  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      try {
        await fetch("/api/chats", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, title }),
        });
        await loadChatList();
      } catch {
        // silent
      }
    },
    [loadChatList]
  );

  // Update system prompt (persists to server)
  const updateSystemPrompt = useCallback(
    async (newPrompt: string) => {
      setChatSystemPrompt(newPrompt);
      if (activeChatId) {
        try {
          await fetch("/api/chats", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId: activeChatId, systemPrompt: newPrompt }),
          });
        } catch {
          // silent
        }
      }
    },
    [activeChatId]
  );

  return {
    messages,
    status,
    error,
    activeChatId,
    chatList,
    chatSystemPrompt,
    setChatSystemPrompt,
    sendMessage,
    stop,
    retry,
    deleteMessage,
    deleteLastExchange,
    clearChat,
    loadChatList,
    loadChat,
    createNewChat,
    deleteChat,
    renameChat,
    updateSystemPrompt,
  };
}

// ─── Main Component ──────────────────────────────────────────────────

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900 text-white"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>}>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ─── Models (loaded from API, fallback to built-in defaults) ─────
  const [chatModels, setChatModels] = useState<ModelOption[]>(AVAILABLE_MODELS);
  const [imageModels, setImageModels] = useState<ModelOption[]>(IMAGE_MODELS);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(
    AVAILABLE_MODELS[0]
  );
  const [selectedImageModel, setSelectedImageModel] = useState<ModelOption>(
    IMAGE_MODELS[0]
  );
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "image" ? "image" : "chat"
  );
  const [selectedPresetId, setSelectedPresetId] = useState("default");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [showSystemPromptPanel, setShowSystemPromptPanel] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageHistory, setImageHistory] = useState<ImageHistoryItemClient[]>([]);
  const [selectedImageItem, setSelectedImageItem] = useState<ImageHistoryItemClient | null>(null);
  const [imageRefAttachments, setImageRefAttachments] = useState<PendingAttachment[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [input, setInput] = useState("");
  const [imageAspectRatio, setImageAspectRatio] = useState("4:3");
  const [imageResolution, setImageResolution] = useState("1K");
  const [editingSystemPrompt, setEditingSystemPrompt] = useState(false);
  const [editingPromptText, setEditingPromptText] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [confirmDeleteImageId, setConfirmDeleteImageId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [reasoningEnabled, setReasoningEnabled] = useState(true);
  const [temperature, setTemperature] = useState(0.6);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    status,
    error: chatError,
    activeChatId,
    chatList,
    chatSystemPrompt,
    setChatSystemPrompt,
    sendMessage,
    stop,
    retry,
    deleteMessage,
    deleteLastExchange,
    clearChat,
    loadChatList,
    loadChat,
    createNewChat,
    deleteChat,
    renameChat,
    updateSystemPrompt,
  } = usePersistentChat();

  const isLoading = status === "streaming" || status === "submitted";
  const isLocalModel = selectedModel.provider === "local";

  // Derive reasoning phase: streaming + last assistant msg has reasoning but no content
  const isReasoningPhase = status === "streaming" && (() => {
    const last = messages[messages.length - 1];
    return last?.role === "assistant" && !!last.reasoning && !last.content;
  })();

  // ─── Helper: compute current system prompt ──────────────────────
  const currentSystemPrompt = selectedPresetId === "custom"
    ? customSystemPrompt
    : SYSTEM_PROMPT_PRESETS.find((p) => p.id === selectedPresetId)?.prompt || SYSTEM_PROMPT_PRESETS[0].prompt;

  // ─── Route sync: read URL on mount ─────────────────────────────
  const initialRouteLoaded = useRef(false);
  useEffect(() => {
    if (initialRouteLoaded.current) return;
    initialRouteLoaded.current = true;

    const chatId = searchParams.get("chat");
    if (chatId) {
      loadChat(chatId);
    }
  }, [searchParams, loadChat]);

  // ─── Route sync: push URL on state change ──────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (mode === "image") params.set("mode", "image");
    if (mode === "chat" && activeChatId) params.set("chat", activeChatId);
    const newUrl = params.toString() ? `/?${params.toString()}` : "/";
    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [mode, activeChatId, router]);

  // ─── Sync system prompt preset when loading a chat ──────────────
  useEffect(() => {
    if (!chatSystemPrompt) {
      setSelectedPresetId("default");
      setCustomSystemPrompt("");
      return;
    }
    const matched = SYSTEM_PROMPT_PRESETS.find(
      (p) => p.id !== "custom" && p.prompt === chatSystemPrompt
    );
    if (matched) {
      setSelectedPresetId(matched.id);
      setCustomSystemPrompt("");
    } else {
      setSelectedPresetId("custom");
      setCustomSystemPrompt(chatSystemPrompt);
    }
  }, [chatSystemPrompt]);

  // Load chats on mount
  useEffect(() => {
    loadChatList();
  }, [loadChatList]);

  // Load models config from API
  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/models");
        if (res.ok) {
          const data: ModelsConfig = await res.json();
          if (data.chatModels?.length) {
            setChatModels(data.chatModels);
            setSelectedModel((prev) =>
              data.chatModels.find((m) => m.id === prev.id) ||
              data.chatModels[0]
            );
          }
          if (data.imageModels?.length) {
            setImageModels(data.imageModels);
            setSelectedImageModel((prev) =>
              data.imageModels.find((m) => m.id === prev.id) ||
              data.imageModels[0]
            );
          }
        }
      } catch {
        // use defaults
      }
    }
    loadModels();
  }, []);

  // Load image history from server
  const loadImageHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/images");
      if (res.ok) {
        const data = await res.json();
        setImageHistory(
          (data.history || []).map((item: ImageHistoryItemClient & { createdAt: string }) => ({
            ...item,
            createdAt: new Date(item.createdAt),
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadImageHistory();
  }, [loadImageHistory]);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ─── File Upload Logic ──────────────────────────────────────────

  async function uploadFile(file: File): Promise<ChatAttachment | null> {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return {
          type: data.type,
          name: data.name,
          mimeType: data.mimeType,
          url: data.url,
        };
      }
    } catch {
      // silent
    }
    return null;
  }

  function addFiles(files: FileList | File[]) {
    const remaining = 10 - pendingAttachments.length;
    if (remaining <= 0) return;
    const newPending: PendingAttachment[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";
      newPending.push({ file, preview, uploading: true });
    }

    setPendingAttachments((prev) => {
      const startIdx = prev.length;
      // Upload each file
      newPending.forEach(async (pa, idx) => {
        const uploaded = await uploadFile(pa.file);
        setPendingAttachments((current) => {
          const updated = [...current];
          const globalIdx = startIdx + idx;
          if (updated[globalIdx]) {
            updated[globalIdx] = {
              ...updated[globalIdx],
              uploading: false,
              uploaded: uploaded || undefined,
            };
          }
          return updated;
        });
      });
      return [...prev, ...newPending];
    });
  }

  function removeAttachment(idx: number) {
    setPendingAttachments((prev) => {
      const updated = [...prev];
      if (updated[idx]?.preview) {
        URL.revokeObjectURL(updated[idx].preview);
      }
      updated.splice(idx, 1);
      return updated;
    });
  }

  // ─── Image Reference Files ──────────────────────────────────────

  function addImageRefFiles(files: File[]) {
    const remaining = 10 - imageRefAttachments.length;
    if (remaining <= 0) return;
    const filesToAdd = files.slice(0, remaining);
    const newPending: PendingAttachment[] = filesToAdd.map((file) => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      uploading: true,
    }));

    setImageRefAttachments((prev) => {
      const startIdx = prev.length;
      newPending.forEach(async (pa, idx) => {
        const uploaded = await uploadFile(pa.file);
        setImageRefAttachments((current) => {
          const updated = [...current];
          const globalIdx = startIdx + idx;
          if (updated[globalIdx]) {
            updated[globalIdx] = {
              ...updated[globalIdx],
              uploading: false,
              uploaded: uploaded || undefined,
            };
          }
          return updated;
        });
      });
      return [...prev, ...newPending];
    });
  }

  function removeImageRefAttachment(idx: number) {
    setImageRefAttachments((prev) => {
      const updated = [...prev];
      if (updated[idx]?.preview) URL.revokeObjectURL(updated[idx].preview);
      updated.splice(idx, 1);
      return updated;
    });
  }

  // Paste handler for images (mode-aware)
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        if (mode === "chat") {
          addFiles(imageFiles);
        } else {
          // Image mode: add as reference files
          addImageRefFiles(imageFiles);
        }
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ─── Handlers ──────────────────────────────────────────────────

  async function handleImageGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!imagePrompt.trim()) return;
    setImageLoading(true);
    setImageError("");
    setImageUrl(null);
    setSelectedImageItem(null);

    // Get reference file URLs if attached
    const refFiles = imageRefAttachments
      .filter((pa) => pa.uploaded)
      .map((pa) => ({
        url: pa.uploaded!.url,
        name: pa.uploaded!.name,
        mimeType: pa.uploaded!.mimeType,
        type: pa.uploaded!.type,
      }));

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          model: selectedImageModel.id,
          referenceFiles: refFiles.length ? refFiles : undefined,
          aspectRatio: imageAspectRatio,
          resolution: imageResolution,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || "Ошибка генерации";
        setImageError(errMsg);
      } else {
        setImageUrl(data.imageUrl);
        // Show the generated image
        if (data.historyItem) {
          setSelectedImageItem({
            ...data.historyItem,
            createdAt: new Date(data.historyItem.createdAt),
          });
        }
      }
    } catch {
      setImageError("Ошибка сети");
    } finally {
      setImageLoading(false);
      // Clear references and reload history from server
      setImageRefAttachments([]);
      setImagePrompt("");
      await loadImageHistory();
    }
  }

  async function deleteImageHistoryItem(id: string) {
    try {
      await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // ignore
    }
    // Clear selection if deleting the viewed item
    if (selectedImageItem?.id === id) {
      setSelectedImageItem(null);
      setImageUrl(null);
    }
    await loadImageHistory();
  }

  function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const attachments: ChatAttachment[] = pendingAttachments
      .filter((pa) => pa.uploaded)
      .map((pa) => pa.uploaded!);

    // Pass system prompt only when starting a new chat (no messages yet)
    const sp = messages.length === 0 ? currentSystemPrompt : undefined;
    const localOpts = isLocalModel ? { temperature, reasoningEnabled } : undefined;
    sendMessage(input, selectedModel, attachments.length ? attachments : undefined, sp, localOpts);
    setInput("");
    setPendingAttachments([]);
  }

  function handleNewChat() {
    clearChat();
    setSelectedPresetId("default");
    setCustomSystemPrompt("");
    setShowSystemPromptPanel(false);
    setSidebarOpen(false);
  }

  function handleSelectChat(chatId: string) {
    loadChat(chatId);
    setMode("chat");
    setSidebarOpen(false);
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white" ref={chatContainerRef}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mode={mode}
        onModeChange={setMode}
        chatModels={chatModels}
        imageModels={imageModels}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        selectedImageModel={selectedImageModel}
        onImageModelChange={setSelectedImageModel}
        chats={chatList}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
        showAllChats={showAllChats}
        onToggleAllChats={() => setShowAllChats(!showAllChats)}
        imageHistory={imageHistory}
        activeImageId={selectedImageItem?.id || null}
        onSelectImageItem={(item) => {
          setSelectedImageItem(item);
          setImageUrl(item.imageUrl);
          setImageError("");
          setSidebarOpen(false);
        }}
        onDeleteImageHistory={deleteImageHistoryItem}
        onNewImageGeneration={() => {
          setSelectedImageItem(null);
          setImageUrl(null);
          setImageError("");
        }}
      />

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-slate-700/40 px-4 py-2.5 md:px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div
              className={`h-2 w-2 rounded-full ${
                PROVIDER_COLORS[(mode === "chat" ? selectedModel : selectedImageModel).provider]
              }`}
            />
            <span>{mode === "chat" ? selectedModel.name : selectedImageModel.name}</span>
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
            <div className="chat-scroll flex-1 overflow-y-auto px-3 py-4 md:px-4">
              {messages.length === 0 && !chatError && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20">
                    <Bot className="h-7 w-7 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Привет! Чем могу помочь?
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Выберите режим и начните диалог
                    </p>
                  </div>

                  {/* System prompt presets */}
                  <div className="mt-2 w-full max-w-md">
                    <div className="grid grid-cols-2 gap-2">
                      {SYSTEM_PROMPT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setSelectedPresetId(preset.id);
                            if (preset.id === "custom") setShowSystemPromptPanel(true);
                            else setShowSystemPromptPanel(false);
                          }}
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-left text-sm transition",
                            selectedPresetId === preset.id
                              ? "border-blue-500 bg-blue-500/10 text-blue-300"
                              : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                          )}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                    {showSystemPromptPanel && selectedPresetId === "custom" && (
                      <textarea
                        value={customSystemPrompt}
                        onChange={(e) => setCustomSystemPrompt(e.target.value)}
                        placeholder="Введите свой системный промпт..."
                        rows={3}
                        className="mt-2 w-full resize-none rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="mx-auto" style={{ maxWidth: "52rem" }}>
                {/* Editable system prompt display */}
                {messages.length > 0 && chatSystemPrompt && (
                  <div className="mb-4">
                    {editingSystemPrompt ? (
                      <div className="rounded-xl border-2 border-dashed border-purple-500/40 bg-purple-500/5 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-purple-400">
                          <Brain className="h-3.5 w-3.5" />
                          Системный промпт
                        </div>
                        <textarea
                          value={editingPromptText}
                          onChange={(e) => setEditingPromptText(e.target.value)}
                          rows={4}
                          className="w-full resize-y rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              updateSystemPrompt(editingPromptText);
                              setEditingSystemPrompt(false);
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-purple-500"
                          >
                            <Check className="h-3 w-3" />
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditingSystemPrompt(false)}
                            className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-600"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPromptText(chatSystemPrompt || "");
                          setEditingSystemPrompt(true);
                        }}
                        className="group w-full rounded-xl border-2 border-dashed border-slate-700/50 bg-slate-800/30 p-3 text-left transition hover:border-purple-500/30 hover:bg-purple-500/5"
                      >
                        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                          <Brain className="h-3 w-3" />
                          <span className="font-medium">Системный промпт</span>
                          <Pencil className="ml-auto h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                        </div>
                        <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">{chatSystemPrompt}</p>
                      </button>
                    )}
                  </div>
                )}
                {messages.map((m, idx) => (
                  <ChatMessage
                    key={m.id}
                    message={m}
                    isLoading={status === "submitted" && idx === messages.length - 1}
                    isStreaming={status === "streaming" && idx === messages.length - 1}
                    isReasoning={isReasoningPhase && idx === messages.length - 1}
                    onDelete={deleteMessage}
                  />
                ))}

                {/* Thinking indicator */}
                {status === "submitted" &&
                  messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="mb-4 flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-800 px-4 py-2.5 text-sm text-slate-400">
                        <Brain className="h-4 w-4 text-purple-400 animate-pulse" />
                        <span>Думаю...</span>
                        <div className="flex gap-1">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                {/* Error banner */}
                {chatError && !isLoading && (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-400">
                          Ошибка
                        </p>
                        <p className="mt-1 text-xs text-red-300/80 break-words">
                          {chatError}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => retry(selectedModel, isLocalModel ? { temperature, reasoningEnabled } : undefined)}
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
            <div className="relative px-3 pb-4 pt-2 md:px-4">
              {/* Gradient fade above input */}
              <div className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />

              <div
                className="mx-auto rounded-2xl bg-slate-800/80 shadow-lg shadow-black/20 ring-1 ring-slate-700/50"
                style={{ maxWidth: "52rem" }}
              >
                {/* Pending attachments preview */}
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-3 pt-3">
                    {pendingAttachments.map((pa, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-lg bg-slate-700/60 p-1"
                      >
                        {pa.preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pa.preview}
                            alt={pa.file.name}
                            className="h-14 w-14 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded bg-slate-700 text-xs text-slate-400">
                            {pa.file.name.slice(0, 8)}
                          </div>
                        )}
                        {pa.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          </div>
                        )}
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-slate-300 hover:bg-red-500 hover:text-white transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={handleChatSubmit}
                  className="flex items-end gap-1 p-2"
                >
                  {/* File upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:text-white hover:bg-slate-700/60"
                    title="Прикрепить файл"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.md,.json,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        addFiles(e.target.files);
                        e.target.value = "";
                      }
                    }}
                  />

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
                    className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder-slate-500 outline-none"
                    style={{ maxHeight: "140px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = target.scrollHeight + "px";
                    }}
                  />
                  <button
                    type={isLoading ? "button" : "submit"}
                    onClick={isLoading ? stop : undefined}
                    disabled={
                      !isLoading &&
                      !input.trim() && pendingAttachments.length === 0
                    }
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
                      isLoading
                        ? "bg-red-500 hover:bg-red-400"
                        : "bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                    title={isLoading ? "Остановить генерацию" : "Отправить"}
                  >
                    {isLoading ? (
                      <div className="h-3.5 w-3.5 rounded-sm bg-white" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>

                {/* Local model controls: Reasoning toggle + Temperature slider */}
                {isLocalModel && (
                  <div className="flex items-center gap-3 overflow-x-auto px-3 pb-2.5 scrollbar-none">
                    {/* Reasoning toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !reasoningEnabled;
                        setReasoningEnabled(next);
                        setTemperature(next ? 0.6 : 0.7);
                      }}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition",
                        reasoningEnabled
                          ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                          : "bg-slate-700/40 text-slate-500 border border-slate-700/50 hover:text-slate-400"
                      )}
                    >
                      <Brain className="h-3 w-3" />
                      <span>Reasoning</span>
                      <span className={cn(
                        "ml-0.5 rounded px-1 py-px text-[9px] font-bold uppercase",
                        reasoningEnabled ? "bg-purple-500/30 text-purple-200" : "bg-slate-600/50 text-slate-500"
                      )}>
                        {reasoningEnabled ? "ON" : "OFF"}
                      </span>
                    </button>

                    <div className="h-3 w-px shrink-0 bg-slate-700/60" />

                    {/* Temperature slider */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Thermometer className="h-3 w-3 text-slate-500" />
                      <input
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.05"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-slate-700 accent-blue-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                      />
                      <span className="min-w-[2rem] text-[10px] text-slate-500 tabular-nums">
                        {temperature.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Image Mode */}
        {mode === "image" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-3 py-4 md:px-4 md:py-8">
              <div className="mx-auto w-full max-w-xl">

              {/* ── History View: show selected image ─────────── */}
              {selectedImageItem && selectedImageItem.imageUrl && (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedImageItem.imageUrl}
                      alt={selectedImageItem.prompt}
                      className="w-full cursor-pointer transition hover:opacity-90"
                      onClick={() => setPreviewImage(selectedImageItem.imageUrl)}
                    />
                    <div className="border-t border-slate-700 bg-slate-800/50 px-4 py-3">
                      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {selectedImageItem.prompt}
                      </p>
                      {/* Reference files used in generation */}
                      {selectedImageItem.referenceFiles && selectedImageItem.referenceFiles.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <span className="text-[10px] text-slate-500 w-full mb-0.5">Файлы контекста:</span>
                          {selectedImageItem.referenceFiles.map((ref, i) => (
                            ref.mimeType.startsWith("image/") ? (
                              <button
                                key={i}
                                onClick={() => setPreviewImage(ref.url)}
                                className="group/ref relative cursor-pointer"
                                title={ref.name}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={ref.url}
                                  alt={ref.name}
                                  className="h-12 w-12 rounded-lg object-cover border border-slate-600 transition group-hover/ref:border-blue-500 group-hover/ref:opacity-80"
                                />
                              </button>
                            ) : (
                              <a
                                key={i}
                                href={ref.url}
                                download={ref.name}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/50 px-2.5 py-1.5 text-[11px] text-slate-400 transition hover:border-blue-500 hover:text-blue-400"
                                title={`Скачать ${ref.name}`}
                              >
                                <Download className="h-3 w-3" />
                                <span className="max-w-[80px] truncate">{ref.name}</span>
                              </a>
                            )
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{selectedImageItem.modelName}</span>
                          <span>•</span>
                          {selectedImageItem.aspectRatio && (
                            <>
                              <span>{selectedImageItem.aspectRatio}</span>
                              <span>•</span>
                            </>
                          )}
                          {selectedImageItem.resolution && (
                            <>
                              <span>{selectedImageItem.resolution}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>
                            {selectedImageItem.createdAt.toLocaleString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={selectedImageItem.imageUrl}
                            download={`image-${selectedImageItem.id}.png`}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-400 transition cursor-pointer hover:bg-slate-700 hover:text-white"
                            title="Скачать"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Скачать
                          </a>
                          <button
                            onClick={() => setConfirmDeleteImageId(selectedImageItem.id)}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-400 transition cursor-pointer hover:bg-red-500/10 hover:text-red-400"
                            title="Удалить"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA to create new generation */}
                  <div className="mt-6 flex flex-col items-center gap-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedImageItem(null);
                        setImageUrl(null);
                        setImageError("");
                      }}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                      <Sparkles className="h-4 w-4" />
                      Создать новое изображение
                    </button>
                    <p className="text-xs text-slate-500">
                      Или выберите другое изображение в истории
                    </p>
                  </div>
                </>
              )}

              {/* ── Generation View: empty state / loading ────── */}
              {!selectedImageItem && !imageLoading && !imageError && (
                <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20">
                    <ImageIcon className="h-7 w-7 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white md:text-xl">
                      <ImageIcon className="mr-2 inline h-5 w-5 text-blue-400 md:h-6 md:w-6" />
                      Генерация изображений
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Введите описание и нажмите «Создать»
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Можно прикрепить до 10 файлов или вставить через Ctrl+V
                    </p>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {imageLoading && (
                <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                  <p className="text-sm text-slate-400">Генерация изображения...</p>
                </div>
              )}
              </div>
            </div>

            {/* Input area pinned to bottom — only in generation mode */}
            {!selectedImageItem && (
            <div className="relative px-3 pb-4 pt-2 md:px-4">
              {/* Gradient fade above input */}
              <div className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />

              <div className="mx-auto w-full max-w-xl rounded-2xl bg-slate-800/80 shadow-lg shadow-black/20 ring-1 ring-slate-700/50">
                {/* Reference files preview */}
                {imageRefAttachments.length > 0 && (
                  <div className="px-3 pt-3">
                    <div className="flex flex-wrap gap-2">
                      {imageRefAttachments.map((pa, idx) => (
                        <div
                          key={idx}
                          className="relative rounded-lg bg-slate-700/60 p-1"
                        >
                          {pa.preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pa.preview}
                              alt={pa.file.name}
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-700 text-[10px] text-slate-400">
                              {pa.file.name.split(".").pop()?.toUpperCase() || "FILE"}
                            </div>
                          )}
                          {pa.uploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                            </div>
                          )}
                          <button
                            onClick={() => removeImageRefAttachment(idx)}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-slate-300 hover:bg-red-500 hover:text-white transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      Файлы для контекста ({imageRefAttachments.length}/10)
                    </span>
                  </div>
                )}

                {/* Input row */}
                <form onSubmit={handleImageGenerate} className="flex items-end gap-1 p-2">
                  <button
                    type="button"
                    onClick={() => imageFileInputRef.current?.click()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition cursor-pointer hover:text-white hover:bg-slate-700/60"
                    title="Прикрепить файлы"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.md,.json,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        addImageRefFiles(Array.from(e.target.files));
                      }
                      e.target.value = "";
                    }}
                  />

                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Опишите изображение..."
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleImageGenerate(e as unknown as React.FormEvent);
                      }
                    }}
                    className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder-slate-500 outline-none"
                    style={{ maxHeight: "140px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = target.scrollHeight + "px";
                    }}
                  />
                  <button
                    type="submit"
                    disabled={imageLoading || !imagePrompt.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 transition cursor-pointer hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Создать"
                  >
                    {imageLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </button>
                </form>

                {/* Compact settings row — scrollable on mobile */}
                <div className="flex items-center gap-3 overflow-x-auto px-3 pb-2.5 scrollbar-none">
                  <div className="flex shrink-0 items-center gap-1.5">
                   <div className="flex gap-0.5">
                      {ASPECT_RATIOS.map((ar) => (
                        <button
                          key={ar.id}
                          type="button"
                          onClick={() => setImageAspectRatio(ar.id)}
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition",
                            imageAspectRatio === ar.id
                              ? "bg-blue-600 text-white"
                              : "text-slate-500 hover:text-white hover:bg-slate-700/60"
                          )}
                        >
                          {ar.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-3 w-px shrink-0 bg-slate-700/60" />
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {RESOLUTIONS.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setImageResolution(r.id)}
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition",
                            imageResolution === r.id
                              ? "bg-blue-600 text-white"
                              : "text-slate-500 hover:text-white hover:bg-slate-700/60"
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {imageError && (
                <div className="mx-auto mt-2 max-w-xl rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {imageError}
                </div>
              )}
            </div>
            )}

            {/* Image preview modal */}
            <ImagePreviewModal
              open={previewImage !== null}
              src={previewImage || ""}
              onClose={() => setPreviewImage(null)}
            />

            {/* Delete confirmation modal */}
            <ConfirmModal
              open={confirmDeleteImageId !== null}
              title="Удалить изображение?"
              message="Изображение и его история будут удалены без возможности восстановления."
              confirmLabel="Удалить"
              variant="danger"
              onConfirm={() => {
                if (confirmDeleteImageId) deleteImageHistoryItem(confirmDeleteImageId);
                setConfirmDeleteImageId(null);
              }}
              onCancel={() => setConfirmDeleteImageId(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
