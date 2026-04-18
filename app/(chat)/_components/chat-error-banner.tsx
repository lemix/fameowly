import { RefreshCw, Trash2, XCircle } from "lucide-react";

interface ChatErrorBannerProps {
  error: string;
  onRetry: () => void;
  onDeleteLastExchange: () => void;
}

/** Error banner with retry and delete actions */
export function ChatErrorBanner({ error, onRetry, onDeleteLastExchange }: ChatErrorBannerProps) {
  return (
    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-400">Ошибка</p>
          <p className="mt-1 text-xs text-th-red-muted/80 break-words">{error}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-th-red transition hover:bg-red-500/30"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Повторить
        </button>
        <button
          onClick={onDeleteLastExchange}
          className="flex items-center gap-1.5 rounded-lg bg-th-subtle/50 px-3 py-1.5 text-xs font-medium text-th-fg-m transition hover:bg-th-subtle"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Удалить
        </button>
      </div>
    </div>
  );
}
