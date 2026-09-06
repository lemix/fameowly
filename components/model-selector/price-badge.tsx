import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption } from "@/lib/types";

interface PriceBadgeProps {
  model: ModelOption;
}

/** Marks models that cost nothing to run. Money itself is a plugin concern. */
export function PriceBadge({ model }: PriceBadgeProps) {
  if (!model.isLocal) return null;

  return (
    <span
      className={cn("flex items-center gap-1 shrink-0 text-emerald-500")}
      data-testid="badge-free"
    >
      <Gift className="h-3.5 w-3.5" />
      <span className="text-xs hidden sm:inline">Бесплатно</span>
    </span>
  );
}
