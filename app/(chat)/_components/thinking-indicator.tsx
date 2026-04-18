import { Bot, Brain } from "lucide-react";

/** Animated "thinking" indicator shown while waiting for assistant response */
export function ThinkingIndicator() {
  return (
    <div className="mb-4 flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-th-accent-bg mt-0.5">
        <Bot className="h-3.5 w-3.5 text-th-accent" />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-th-border/60 bg-th-panel px-4 py-2.5 text-sm text-th-fg-m">
        <Brain className="h-4 w-4 text-th-purple animate-pulse" />
        <span>Думаю...</span>
        <div className="flex gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-th-accent animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-th-accent animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-th-accent animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}
