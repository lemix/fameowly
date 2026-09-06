"use client";

/**
 * Plugin UI slots — the single client-side extension point for plugin views.
 *
 * Core renders `<PluginSlot id="…" />` where a plugin may contribute a view.
 * When no plugin fills the slot, `fallback` is rendered instead, so the OSS
 * build never ships plugin-only screens.
 */

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { usePluginCapabilities } from "@/hooks/use-plugin-capabilities";

export type SlotProps = Record<string, unknown>;

type Loader = () => Promise<Record<string, unknown>>;

// Bundlers require literal import paths, so the map cannot be built from data.
// When adding a slot, also update lib/plugin-stub-registry.js.
const loaders: Record<string, Loader> = {
  "providers": () => import("@plugins/ext/providers/components/provider-manager"),
  "models": () => import("@plugins/ext/providers/components/model-manager"),
  "usage-page": () => import("@plugins/ext/billing/components/usage-page"),
  "user-usage": () => import("@plugins/ext/billing/components/user-usage-modal"),
  "chat-usage": () => import("@plugins/ext/billing/components/chat-usage-badge"),
  "user-profile": () => import("@plugins/ext/billing/components/user-profile-cell"),
  "user-filter": () => import("@plugins/ext/billing/components/user-filter"),
  "rate-plans": () => import("@plugins/ext/billing/components/rate-plan-manager"),
  "tags": () => import("@plugins/ext/billing/components/tag-manager"),
};

// Slots rendered inline next to other controls must not show a block placeholder.
const INLINE_SLOTS = new Set(["chat-usage", "user-usage", "user-profile", "user-filter"]);

// Built once at module scope: dynamic() defers the actual import until render,
// while keeping component identity stable across renders.
const slotComponents: Record<string, ComponentType<SlotProps>> = Object.fromEntries(
  Object.entries(loaders).map(([id, loader]) => [
    id,
    dynamic(
      () =>
        loader().then((mod) => ({
          default: Object.values(mod).find(
            (v) => typeof v === "function",
          ) as ComponentType<SlotProps>,
        })),
      {
        loading: INLINE_SLOTS.has(id)
          ? () => null
          : () => <div className="text-th-fg-m py-8 text-center">Загрузка…</div>,
      },
    ),
  ]),
);

interface PluginSlotProps {
  id: string;
  props?: SlotProps;
  /** Rendered when no plugin fills this slot */
  fallback?: ReactNode;
}

export function PluginSlot({ id, props, fallback = null }: PluginSlotProps) {
  const { uiSlots, ready } = usePluginCapabilities();

  if (!ready) return null;

  const Component = slotComponents[id];
  if (!Component || !uiSlots.includes(id)) return <>{fallback}</>;

  return <Component {...(props ?? {})} />;
}
