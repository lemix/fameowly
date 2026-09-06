/**
 * Strategy: OSS defaults for the pricing, model access and user lifecycle
 * contracts. They deliberately do nothing — pricing and access control are
 * plugin territory.
 */

import type {
  PricingPolicy,
  CostSnapshot,
  ModelAccessPolicy,
  UserLifecycle,
} from "../contracts";
import type { ModelsConfig } from "../models";

/** Reports "not billed" for every request */
export class NoPricingPolicy implements PricingPolicy {
  chatCost(): CostSnapshot | null {
    return null;
  }

  imageCost(): CostSnapshot | null {
    return null;
  }
}

/** Every model is available to every user */
export class OpenModelAccessPolicy implements ModelAccessPolicy {
  filter(_userId: string, config: ModelsConfig): ModelsConfig {
    return config;
  }

  canUse(): boolean {
    return true;
  }
}

/** Nothing to clean up outside users.json */
export class NoopUserLifecycle implements UserLifecycle {
  async onUserDeleted(): Promise<void> {}
}
