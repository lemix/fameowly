/**
 * Contract: usage tracking after LLM generation completes.
 * OSS strategy is a no-op. Extension plugins can track tokens for billing.
 */

import type { TokenUsage } from "../types";

export interface UsageTracker {
  /** Called after a chat generation completes */
  onChatFinish(
    userId: string,
    modelId: string,
    usage: TokenUsage,
    chatId?: string,
  ): Promise<void>;

  /** Called after an image generation completes */
  onImageFinish(userId: string, modelId: string): Promise<void>;
}
