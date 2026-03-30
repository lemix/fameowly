import { Bot, Brain } from "lucide-react";

/** Animated "thinking" indicator shown while waiting for assistant response */
export function ThinkingIndicator() {
  return (
    <div className="mb-4 flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 mt-0.5">
        <Bot className="h-3.5 w-3.5 text-blue-400" />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-800 px-4 py-2.5 text-sm text-slate-400">
        <Brain className="h-4 w-4 text-purple-400 animate-pulse" />
        <span>Думаю...</span>
        <div className="flex gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}
