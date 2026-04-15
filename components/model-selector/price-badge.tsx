import { Coins, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption, UserInfo } from "@/lib/types";

interface PriceBadgeProps {
  model: ModelOption;
  user: UserInfo | null;
  family: boolean;
}

export function PriceBadge({ model, user, family }: PriceBadgeProps) {
  if (!user) return null;

  const cfg =
    family && model.isLocal
      ? { icon: Gift, text: "Бесплатно", color: "text-emerald-500", tid: "badge-free" }
      : user.role === "client" && model.clientPrice != null
        ? { icon: Coins, text: `${model.clientPrice} 🪙`, color: "text-amber-400", tid: "badge-price" }
        : family && model.tier === "ultra" && (model.clientPrice ?? 0) > 5
          ? { icon: Coins, text: "Дорого", color: "text-orange-500", tid: "badge-expensive" }
          : null;

  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <span className={cn("flex items-center gap-1 shrink-0", cfg.color)} data-testid={cfg.tid}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs hidden sm:inline">{cfg.text}</span>
    </span>
  );
}
