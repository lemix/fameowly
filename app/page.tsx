"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { AppHeader } from "@/components/app-header";
import { ChatView } from "@/app/(chat)/_components/chat-view";
import { ImageView } from "@/app/(image)/_components/image-view";
import { usePageState } from "@/hooks/use-page-state";

// ─── Main Component ──────────────────────────────────────────────────

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center bg-slate-900 text-white"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>}>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const s = usePageState();

  return (
    <div className="flex h-dvh bg-slate-900 text-white">
      <Sidebar
        isOpen={s.sidebarOpen}
        onClose={() => s.setSidebarOpen(false)}
        mode={s.mode}
        onModeChange={s.setMode}
        chatModels={s.chatModels}
        imageModels={s.imageModels}
        selectedModel={s.selectedModel}
        onModelChange={s.setSelectedModel}
        selectedImageModel={s.selectedImageModel}
        onImageModelChange={s.setSelectedImageModel}
        chats={s.chatList}
        activeChatId={s.activeChatId}
        onSelectChat={s.handleSelectChat}
        onNewChat={s.handleNewChat}
        onDeleteChat={s.deleteChat}
        onRenameChat={s.renameChat}
        showAllChats={s.showAllChats}
        onToggleAllChats={() => s.setShowAllChats(!s.showAllChats)}
        imageHistory={s.imageHistory}
        activeImageId={s.selectedImageItem?.id || null}
        onSelectImageItem={s.handleSelectImageItem}
        onDeleteImageHistory={s.deleteImageHistoryItem}
        onNewImageGeneration={s.handleNewImageGeneration}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          mode={s.mode}
          selectedModel={s.selectedModel}
          selectedImageModel={s.selectedImageModel}
          isLoading={s.isLoading}
          status={s.status}
          onToggleSidebar={() => s.setSidebarOpen(!s.sidebarOpen)}
        />

        {s.mode === "chat" && (
          <ChatView
            messages={s.messages}
            status={s.status}
            error={s.error}
            chatSystemPrompt={s.chatSystemPrompt}
            isLoading={s.isLoading}
            isReasoningPhase={s.isReasoningPhase}
            input={s.input}
            onInputChange={s.setInput}
            onSubmit={s.handleChatSubmit}
            onStop={s.stop}
            onDeleteMessage={s.deleteMessage}
            onRetry={() => s.retry(s.selectedModel, s.isLocalModel ? { temperature: s.temperature, reasoningEnabled: s.reasoningEnabled } : undefined)}
            onDeleteLastExchange={s.deleteLastExchange}
            onUpdateSystemPrompt={s.updateSystemPrompt}
            pendingAttachments={s.pendingAttachments}
            onAddFiles={s.addFiles}
            onRemoveAttachment={s.removeAttachment}
            selectedPresetId={s.selectedPresetId}
            onSelectPreset={s.setSelectedPresetId}
            customSystemPrompt={s.customSystemPrompt}
            onCustomPromptChange={s.setCustomSystemPrompt}
            showSystemPromptPanel={s.showSystemPromptPanel}
            onShowPanelChange={s.setShowSystemPromptPanel}
            isLocalModel={s.isLocalModel}
            reasoningEnabled={s.reasoningEnabled}
            onReasoningToggle={s.handleReasoningToggle}
            temperature={s.temperature}
            onTemperatureChange={s.setTemperature}
          />
        )}

        {s.mode === "image" && (
          <ImageView
            selectedItem={s.selectedImageItem}
            imageLoading={s.imageLoading}
            imageError={s.imageError}
            imagePrompt={s.imagePrompt}
            onPromptChange={s.setImagePrompt}
            onGenerate={s.handleImageGenerate}
            onDelete={s.deleteImageHistoryItem}
            onNewGeneration={s.handleNewImageGeneration}
            refAttachments={s.imageRefAttachments}
            onAddRefFiles={s.addImageRefFiles}
            onRemoveRefAttachment={s.removeImageRefAttachment}
            aspectRatio={s.imageAspectRatio}
            onAspectRatioChange={s.setImageAspectRatio}
            resolution={s.imageResolution}
            onResolutionChange={s.setImageResolution}
            previewImage={s.previewImage}
            onPreviewChange={s.setPreviewImage}
            confirmDeleteId={s.confirmDeleteImageId}
            onConfirmDeleteChange={s.setConfirmDeleteImageId}
          />
        )}
      </main>
    </div>
  );
}
