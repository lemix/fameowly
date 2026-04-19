/**
 * Strategy: no-op usage tracker for OSS builds.
 * Does nothing — no logging, no billing, no side effects.
 */

import type { UsageTracker } from "../contracts";
import type { TokenUsage } from "../types";

export class NoopUsageTracker implements UsageTracker {
  async onChatFinish(
    _userId: string,
    _modelId: string,
    _usage: TokenUsage,
    _chatId?: string,
  ): Promise<void> {
    // No-op in OSS
  }

  async onImageFinish(
    _userId: string,
    _modelId: string,
    _cost: number,
  ): Promise<void> {
    // No-op in OSS
  }
}
