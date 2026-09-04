/**
 * Pricing domain logic — turns token counts into money.
 *
 * A model without prices is treated as free. The commercial markup defaults
 * to 1. Results are snapshotted into UsageRecord at request time so later
 * price edits never rewrite history.
 */

import type { ModelOption } from "./models";
import type { TokenUsage } from "./types";

const TOKENS_PER_UNIT = 1_000_000;
const PRECISION = 1_000_000; // 6 decimal places

export interface CostBreakdown {
  inputPricePer1M: number;
  outputPricePer1M: number;
  markup: number;
  /** Provider cost in USD, before markup */
  baseCost: number;
  /** Charged cost in USD: baseCost * markup */
  cost: number;
}

function round(value: number): number {
  return Math.round(value * PRECISION) / PRECISION;
}

/** Commercial multiplier; anything non-positive or absent means "no markup" */
export function resolveMarkup(model?: ModelOption): number {
  const raw = model?.markup;
  return typeof raw === "number" && raw > 0 ? raw : 1;
}

export function calcChatCost(
  model: ModelOption | undefined,
  usage: TokenUsage,
): CostBreakdown {
  const inputPricePer1M = model?.inputPricePer1M ?? 0;
  const outputPricePer1M = model?.outputPricePer1M ?? 0;
  const markup = resolveMarkup(model);
  const baseCost =
    (usage.promptTokens / TOKENS_PER_UNIT) * inputPricePer1M +
    (usage.completionTokens / TOKENS_PER_UNIT) * outputPricePer1M;

  return {
    inputPricePer1M,
    outputPricePer1M,
    markup,
    baseCost: round(baseCost),
    cost: round(baseCost * markup),
  };
}

export function calcImageCost(model: ModelOption | undefined): CostBreakdown {
  const baseCost = model?.pricePerImage ?? 0;
  const markup = resolveMarkup(model);

  return {
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    markup,
    baseCost: round(baseCost),
    cost: round(baseCost * markup),
  };
}

/** Format a USD amount for the UI; sub-cent values keep more precision */
export function formatCost(value: number): string {
  if (value <= 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(2)}`;
}
