/**
 * Strategy: OSS token accounting.
 *
 * Keeps a per-chat aggregate inside the chat file — no request journal,
 * no prices. Plugins replace this with a full journal.
 */

import type { UsageTracker, ChatFinishContext } from "../contracts";
import { recordChatUsage } from "../chat-store";

export class ChatTotalsUsageTracker implements UsageTracker {
  async onChatFinish(context: ChatFinishContext): Promise<void> {
    if (!context.chatId) return;
    recordChatUsage(context.userId, context.chatId, context.usage);
  }

  async onImageFinish(): Promise<void> {
    // Images have no chat to attach tokens to
  }
}
