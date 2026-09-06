"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Error boundary with friendly fallback UI and reload button */
export class ChatErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="text-5xl">😿</div>
          <h2 className="text-lg font-semibold text-th-fg">
            Ой, что-то пошло не так
          </h2>
          <p className="max-w-md text-sm text-th-fg-m">
            Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
          </p>
          {this.state.error && (
            <p className="max-w-md text-xs text-th-fg-d break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-xl bg-th-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-th-accent-muted min-h-[44px]"
          >
            <RefreshCw className="h-4 w-4" />
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
