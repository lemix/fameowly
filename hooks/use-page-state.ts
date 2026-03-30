"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ChatAttachment, Mode, ImageHistoryItemClient } from "@/lib/types";
import { SYSTEM_PROMPT_PRESETS } from "@/lib/constants/system-prompts";
import { usePersistentChat } from "./use-persistent-chat";
import { useFileUpload } from "./use-file-upload";
import { useImageGeneration } from "./use-image-generation";
import { useImageHistory } from "./use-image-history";
import { useModels } from "./use-models";

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
  const [reasoningEnabled, setReasoningEnabled] = useState(true);
  const [temperature, setTemperature] = useState(0.6);

  const chat = usePersistentChat();
  const isLoading = chat.status === "streaming" || chat.status === "submitted";
  const isLocalModel = selectedModel.provider === "local";
  const isReasoningPhase = chat.status === "streaming" && (() => {
    const last = chat.messages[chat.messages.length - 1];
    return last?.role === "assistant" && !!last.reasoning && !last.content;
  })();
  const currentSystemPrompt = selectedPresetId === "custom"
    ? customSystemPrompt
    : SYSTEM_PROMPT_PRESETS.find((p) => p.id === selectedPresetId)?.prompt || SYSTEM_PROMPT_PRESETS[0].prompt;

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

  // Handlers
  const handleChatSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const attachments: ChatAttachment[] = fileUpload.pendingAttachments.filter((pa) => pa.uploaded).map((pa) => pa.uploaded!);
    const sp = chat.messages.length === 0 ? currentSystemPrompt : undefined;
    const localOpts = isLocalModel ? { temperature, reasoningEnabled } : undefined;
    chat.sendMessage(input, selectedModel, attachments.length ? attachments : undefined, sp, localOpts);
    setInput(""); fileUpload.setPendingAttachments([]);
  }, [input, isLoading, fileUpload, chat, currentSystemPrompt, isLocalModel, temperature, reasoningEnabled, selectedModel]);

  const handleNewChat = useCallback(() => {
    chat.clearChat(); setSelectedPresetId("default"); setCustomSystemPrompt("");
    setShowSystemPromptPanel(false); setSidebarOpen(false);
  }, [chat]);

  const handleSelectChat = useCallback((chatId: string) => {
    chat.loadChat(chatId); setMode("chat"); setSidebarOpen(false);
  }, [chat]);

  const handleSelectImageItem = useCallback((item: ImageHistoryItemClient) => {
    imageGen.setSelectedImageItem(item); imageGen.setImageUrl(item.imageUrl);
    imageGen.setImageError(""); setSidebarOpen(false);
  }, [imageGen]);

  const handleNewImageGeneration = useCallback(() => {
    imageGen.setSelectedImageItem(null); imageGen.setImageUrl(null); imageGen.setImageError("");
  }, [imageGen]);

  const handleReasoningToggle = useCallback(() => {
    const next = !reasoningEnabled; setReasoningEnabled(next); setTemperature(next ? 0.6 : 0.7);
  }, [reasoningEnabled]);

  return {
    mode, setMode, sidebarOpen, setSidebarOpen, showAllChats, setShowAllChats,
    chatModels, imageModels, selectedModel, setSelectedModel, selectedImageModel, setSelectedImageModel,
    ...chat, isLoading, isLocalModel, isReasoningPhase,
    input, setInput,
    selectedPresetId, setSelectedPresetId, customSystemPrompt, setCustomSystemPrompt,
    showSystemPromptPanel, setShowSystemPromptPanel, currentSystemPrompt,
    reasoningEnabled, temperature, setTemperature, handleReasoningToggle,
    ...fileUpload, ...imageGen, imageHistory,
    handleChatSubmit, handleNewChat, handleSelectChat, handleSelectImageItem, handleNewImageGeneration,
  };
}
