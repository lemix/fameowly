/**
 * Contracts — pure TypeScript interfaces for the DI container.
 * No implementations, no side effects.
 */

export type { ProviderResolver } from "./credential-resolver";
export type { ModelFactory } from "./model-factory";
export type { UsageTracker, ChatFinishContext } from "./usage-tracker";
export type { PricingPolicy, CostSnapshot } from "./pricing-policy";
export type { ModelAccessPolicy } from "./model-access-policy";
export type { UserLifecycle } from "./user-lifecycle";
