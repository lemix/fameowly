/**
 * Contract: which models a user may see and use.
 * The OSS implementation grants everything to everyone.
 */

import type { ModelsConfig } from "../models";

export interface ModelAccessPolicy {
  /** Narrow the catalogue shown to a user */
  filter(userId: string, config: ModelsConfig): ModelsConfig;
  /** Guard for generation requests */
  canUse(userId: string, modelId: string): boolean;
}
