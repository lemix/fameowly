/**
 * Contract: how a request turns into money.
 *
 * The OSS implementation returns `null`, meaning "not billed" — distinct from
 * a cost of `0`, which is a genuinely free model. Anything rendering money
 * must hide itself on `null`.
 */

import type { TokenUsage } from "../types";

export interface CostSnapshot {
  /** Provider cost in USD, before markup */
  baseCost: number;
  /** Charged cost in USD */
  cost: number;
  /** Multiplier applied to the provider cost */
  markup: number;
}

export interface PricingPolicy {
  chatCost(userId: string, modelId: string, usage: TokenUsage): CostSnapshot | null;
  imageCost(userId: string, modelId: string): CostSnapshot | null;
}
