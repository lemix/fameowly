"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ChatAttachment, Mode, ImageHistoryItemClient } from "@/lib/types";
import { SYSTEM_PROMPT_PRESETS } from "@/lib/constants/system-prompts";
import { getDefaultModel } from "@/lib/models";
import { usePersistentChat } from "./use-persistent-chat";
import { useFileUpload } from "./use-file-upload";
import { useImageGeneration } from "./use-image-generation";
import { useImageHistory } from "./use-image-history";
import { useModels } from "./use-models";
import { useChatSettings } from "./use-chat-settings";

export function usePageState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { chatModels, imageModels, selectedModel, setSelectedModel, selectedImageModel, setSelectedImageModel } = useModels();
  const { imageHistory, loadImageHistory } = useImageHistory();

  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "image" ? "image" : "chat");
  const [selectedPresetId, setSelectedPresetId] = useState("default");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [showSystemPromptPanel, setShowSystemPromptPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [input, setInput] = useState("");

  const chat = usePersistentChat();

  // Per-chat settings (Task 4: persisted in localStorage per chat)
  const { temperature, setTemperature, reasoningEnabled, setReasoningEnabled, resetToDefaults } = useChatSettings(chat.activeChatId);

  const isLoading = chat.status === "streaming" || chat.status === "submitted";
  const isReasoningPhase = chat.status === "streaming" && (() => {
    const last = chat.messages[chat.messages.length - 1];
    return last?.role === "assistant" && !!last.reasoning && !last.content;
  })();
  const currentSystemPrompt = selectedPresetId === "custom"
    ? customSystemPrompt
    : SYSTEM_PROMPT_PRESETS.find((p) => p.id === selectedPresetId)?.prompt || SYSTEM_PROMPT_PRESETS[0].prompt;

  // Ghost model detection: check if the current chat's model is still available
  const modelUnavailable = useMemo(() => {
    if (!chat.activeChatId) return false;
    return !chatModels.some((m) => m.id === selectedModel.id);
  }, [chat.activeChatId, chatModels, selectedModel.id]);

  // Model capability flags (Task 3)
  const supportsTemperature = selectedModel.supportsTemperature ?? selectedModel.isLocal;
  const supportsReasoning = selectedModel.supportsReasoning ?? selectedModel.isLocal;

  const fileUpload = useFileUpload(mode);
  const imageGen = useImageGeneration({
    selectedImageModel,
    imageRefAttachments: fileUpload.imageRefAttachments,
    setImageRefAttachments: fileUpload.setImageRefAttachments,
    loadImageHistory,
  });

  // Route sync: read URL on mount
  const initialRouteLoaded = useRef(false);
  useEffect(() => {
    if (initialRouteLoaded.current) return;
    initialRouteLoaded.current = true;
    const chatId = searchParams.get("chat");
    if (chatId) chat.loadChat(chatId);
  }, [searchParams, chat.loadChat]); // eslint-disable-line react-hooks/exhaustive-deps

  // Route sync: push URL on state change
  useEffect(() => {
    const params = new URLSearchParams();
    if (mode === "image") params.set("mode", "image");
    if (mode === "chat" && chat.activeChatId) params.set("chat", chat.activeChatId);
    const newUrl = params.toString() ? `/?${params.toString()}` : "/";
    if (window.location.pathname + window.location.search !== newUrl) router.replace(newUrl, { scroll: false });
  }, [mode, chat.activeChatId, router]);

  // Sync system prompt preset when loading a chat
  useEffect(() => {
    if (!chat.chatSystemPrompt) { setSelectedPresetId("default"); setCustomSystemPrompt(""); return; }
    const matched = SYSTEM_PROMPT_PRESETS.find((p) => p.id !== "custom" && p.prompt === chat.chatSystemPrompt);
    if (matched) { setSelectedPresetId(matched.id); setCustomSystemPrompt(""); }
    else { setSelectedPresetId("custom"); setCustomSystemPrompt(chat.chatSystemPrompt); }
  }, [chat.chatSystemPrompt]);

  useEffect(() => { chat.loadChatList(); }, [chat.loadChatList]); // eslint-disable-line react-hooks/exhaustive-deps

  // When model is changed in an existing chat, update chat.modelId on server
  const handleModelChange = useCallback((model: typeof selectedModel) => {
    setSelectedModel(model);
    if (chat.activeChatId) {
      // Update chat's model on server
      fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chat.activeChatId, modelId: model.id }),
      }).catch(() => { /* silent */ });
    }
  }, [chat.activeChatId, setSelectedModel]);

  // Handlers
  const handleChatSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || modelUnavailable) return;
    const attachments: ChatAttachment[] = fileUpload.pendingAttachments.filter((pa) => pa.uploaded).map((pa) => pa.uploaded!);
    const sp = chat.messages.length === 0 ? currentSystemPrompt : undefined;

    // Task 3: Build localOptions based on model capabilities.
    // Temperature reduction for reasoning happens "under the hood" here, NOT in UI.
    let localOptions: { temperature?: number; reasoningEnabled?: boolean } | undefined;
    if (supportsTemperature || supportsReasoning) {
      let effectiveTemp = temperature;
      // Business rule: reduce temperature by 0.1 when reasoning is enabled
      if (supportsReasoning && reasoningEnabled && supportsTemperature) {
        effectiveTemp = Math.max(0, temperature - 0.1);
      }
      localOptions = {
        temperature: supportsTemperature ? effectiveTemp : undefined,
        reasoningEnabled: supportsReasoning ? reasoningEnabled : undefined,
      };
    }

    chat.sendMessage(input, selectedModel, attachments.length ? attachments : undefined, sp, localOptions);
    setInput(""); fileUpload.setPendingAttachments([]);
  }, [input, isLoading, modelUnavailable, fileUpload, chat, currentSystemPrompt, supportsTemperature, supportsReasoning, temperature, reasoningEnabled, selectedModel]);

  const handleNewChat = useCallback(() => {
    chat.clearChat(); setSelectedPresetId("default"); setCustomSystemPrompt("");
    setShowSystemPromptPanel(false); setSidebarOpen(false);
    resetToDefaults();
    // Task 5: Reset to default model (first basic tier)
    setSelectedModel(getDefaultModel(chatModels));
  }, [chat, chatModels, setSelectedModel, resetToDefaults]);

  const handleSelectChat = useCallback((chatId: string) => {
    chat.loadChat(chatId); setMode("chat"); setSidebarOpen(false);
  }, [chat]);

  // After loading a chat, sync the model from chat data
  useEffect(() => {
    if (!chat.activeChatId || !chat.chatList.length) return;
    const activeChat = chat.chatList.find((c) => c.id === chat.activeChatId);
    if (activeChat?.modelId) {
      const chatModel = chatModels.find((m) => m.id === activeChat.modelId);
      if (chatModel) {
        setSelectedModel(chatModel);
      }
      // If model not found — modelUnavailable will be true via useMemo
    }
  }, [chat.activeChatId, chat.chatList, chatModels, setSelectedModel]);

  const handleSelectImageItem = useCallback((item: ImageHistoryItemClient) => {
    imageGen.setSelectedImageItem(item); imageGen.setImageUrl(item.imageUrl);
    imageGen.setImageError(""); setSidebarOpen(false);
  }, [imageGen]);

  const handleNewImageGeneration = useCallback(() => {
    imageGen.setSelectedImageItem(null); imageGen.setImageUrl(null); imageGen.setImageError("");
  }, [imageGen]);

  // Task 3: Reasoning toggle is decoupled from temperature — no temperature change
  const handleReasoningToggle = useCallback(() => {
    setReasoningEnabled(!reasoningEnabled);
  }, [reasoningEnabled, setReasoningEnabled]);

  return {
    mode, setMode, sidebarOpen, setSidebarOpen, showAllChats, setShowAllChats,
    chatModels, imageModels, selectedModel, setSelectedModel: handleModelChange, selectedImageModel, setSelectedImageModel,
    ...chat, isLoading, isReasoningPhase, modelUnavailable,
    input, setInput,
    selectedPresetId, setSelectedPresetId, customSystemPrompt, setCustomSystemPrompt,
    showSystemPromptPanel, setShowSystemPromptPanel, currentSystemPrompt,
    reasoningEnabled, temperature, setTemperature, handleReasoningToggle,
    supportsTemperature, supportsReasoning,
    ...fileUpload, ...imageGen, imageHistory,
    handleChatSubmit, handleNewChat, handleSelectChat, handleSelectImageItem, handleNewImageGeneration,
  };
}

