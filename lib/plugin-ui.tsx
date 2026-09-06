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
import { slotLoaders, inlineSlots } from "@/lib/generated/plugin-slots";

export type SlotProps = Record<string, unknown>;

// Built once at module scope: dynamic() defers the actual import until render,
// while keeping component identity stable across renders.
const slotComponents: Record<string, ComponentType<SlotProps>> = Object.fromEntries(
  Object.entries(slotLoaders).map(([id, loader]) => [
    id,
    dynamic(
      () =>
        loader().then((mod) => ({
          default: Object.values(mod).find(
            (v) => typeof v === "function",
          ) as ComponentType<SlotProps>,
        })),
      {
        loading: inlineSlots.has(id)
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
