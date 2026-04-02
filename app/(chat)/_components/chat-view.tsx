"use client";

import { useRef, useEffect, useCallback } from "react";
import { SYSTEM_PROMPT_PRESETS } from "@/lib/constants/system-prompts";
import type { MessageData, ChatStatus, PendingAttachment, SystemPromptPreset } from "@/lib/types";
import { ChatMessage } from "@/components/chat-message/chat-message";
import { ChatEmptyState } from "./chat-empty-state";
import { SystemPromptDisplay } from "./system-prompt-display";
import { ThinkingIndicator } from "./thinking-indicator";
import { ChatErrorBanner } from "./chat-error-banner";
import { ChatInput } from "./chat-input";

interface ChatViewProps {
  messages: MessageData[];
  status: ChatStatus;
  error: string | null;
  chatSystemPrompt: string | undefined;
  isLoading: boolean;
  isReasoningPhase: boolean;
  // Input
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  // Message actions
  onDeleteMessage: (messageId: string) => void;
  onRetry: () => void;
  onDeleteLastExchange: () => void;
  onUpdateSystemPrompt: (prompt: string) => void;
  // Attachments
  pendingAttachments: PendingAttachment[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (idx: number) => void;
  // Preset selection
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  customSystemPrompt: string;
  onCustomPromptChange: (value: string) => void;
  showSystemPromptPanel: boolean;
  onShowPanelChange: (show: boolean) => void;
  // Local model
  isLocalModel: boolean;
  reasoningEnabled: boolean;
  onReasoningToggle: () => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  // Model availability
  modelUnavailable?: boolean;
}

/** Chat mode orchestrator — messages list, input, system prompt, errors */
export function ChatView({
  messages, status, error, chatSystemPrompt,
  isLoading, isReasoningPhase,
  input, onInputChange, onSubmit, onStop,
  onDeleteMessage, onRetry, onDeleteLastExchange, onUpdateSystemPrompt,
  pendingAttachments, onAddFiles, onRemoveAttachment,
  selectedPresetId, onSelectPreset, customSystemPrompt, onCustomPromptChange,
  showSystemPromptPanel, onShowPanelChange,
  isLocalModel, reasoningEnabled, onReasoningToggle,
  temperature, onTemperatureChange,
  modelUnavailable,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const showThinking =
    status === "submitted" &&
    messages[messages.length - 1]?.role !== "assistant";

  return (
    <>
      {/* Messages */}
      <div className="chat-scroll flex-1 overflow-y-auto px-3 py-4 md:px-4">
        {messages.length === 0 && !error && (
          <ChatEmptyState
            presets={SYSTEM_PROMPT_PRESETS}
            selectedPresetId={selectedPresetId}
            onSelectPreset={onSelectPreset}
            customSystemPrompt={customSystemPrompt}
            onCustomPromptChange={onCustomPromptChange}
            showPanel={showSystemPromptPanel}
            onShowPanelChange={onShowPanelChange}
          />
        )}

        <div className="mx-auto" style={{ maxWidth: "800px" }}>
          {messages.length > 0 && chatSystemPrompt && (
            <SystemPromptDisplay
              systemPrompt={chatSystemPrompt}
              onSave={onUpdateSystemPrompt}
            />
          )}

          {messages.map((m, idx) => (
            <ChatMessage
              key={m.id}
              message={m}
              isLoading={status === "submitted" && idx === messages.length - 1}
              isStreaming={status === "streaming" && idx === messages.length - 1}
              isReasoning={isReasoningPhase && idx === messages.length - 1}
              onDelete={onDeleteMessage}
            />
          ))}

          {showThinking && <ThinkingIndicator />}

          {error && !isLoading && (
            <ChatErrorBanner
              error={error}
              onRetry={onRetry}
              onDeleteLastExchange={onDeleteLastExchange}
            />
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        input={input}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        onStop={onStop}
        isLoading={isLoading}
        disabled={modelUnavailable}
        disabledPlaceholder="Выберите новую модель для продолжения общения"
        pendingAttachments={pendingAttachments}
        onAddFiles={onAddFiles}
        onRemoveAttachment={onRemoveAttachment}
        isLocalModel={isLocalModel}
        reasoningEnabled={reasoningEnabled}
        onReasoningToggle={onReasoningToggle}
        temperature={temperature}
        onTemperatureChange={onTemperatureChange}
      />
    </>
  );
}
