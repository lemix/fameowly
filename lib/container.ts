/**
 * DI Container — lightweight service locator for strategy registration.
 * No external dependencies. Strategies are registered at startup by
 * the plugin loader; API routes resolve them via container.get().
 *
 * Last register() wins — extension plugins override OSS defaults.
 */

import type {
  ProviderResolver,
  ModelFactory,
  UsageTracker,
  PricingPolicy,
  ModelAccessPolicy,
  UserLifecycle,
} from "./contracts";

export interface ServiceMap {
  providerResolver: ProviderResolver;
  modelFactory: ModelFactory;
  usageTracker: UsageTracker;
  pricingPolicy: PricingPolicy;
  modelAccessPolicy: ModelAccessPolicy;
  userLifecycle: UserLifecycle;
}

/** Registry surface exposed to plugins during register() */
export interface ServiceRegistry {
  register<K extends keyof ServiceMap>(key: K, impl: ServiceMap[K]): void;
  get<K extends keyof ServiceMap>(key: K): ServiceMap[K];
  has<K extends keyof ServiceMap>(key: K): boolean;
}

class Container implements ServiceRegistry {
  private services = new Map<string, unknown>();

  register<K extends keyof ServiceMap>(key: K, impl: ServiceMap[K]): void {
    this.services.set(key, impl);
  }

  get<K extends keyof ServiceMap>(key: K): ServiceMap[K] {
    const svc = this.services.get(key);
    if (!svc) {
      throw new Error(
        `[container] Service "${key}" not registered. ` +
        `Ensure plugin-loader has been called before accessing the container.`,
      );
    }
    return svc as ServiceMap[K];
  }

  has<K extends keyof ServiceMap>(key: K): boolean {
    return this.services.has(key);
  }
}

/** Singleton container instance */
export const container = new Container();
