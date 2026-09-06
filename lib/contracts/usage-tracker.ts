/**
 * Contract: usage tracking after LLM generation completes.
 *
 * The OSS strategy keeps a per-chat token aggregate; plugins can replace it
 * with a per-request journal, pricing and billing.
 */

import type { TokenUsage } from "../types";

export interface ChatFinishContext {
  userId: string;
  modelId: string;
  usage: TokenUsage;
  chatId?: string;
  /** Id of the user message that triggered the request */
  userMessageId?: string;
  /** Id the client will assign to the assistant reply */
  assistantMessageId?: string;
}

export interface UsageTracker {
  /** Called after a chat generation completes */
  onChatFinish(context: ChatFinishContext): Promise<void>;

  /** Called after an image generation completes */
  onImageFinish(userId: string, modelId: string): Promise<void>;
}
