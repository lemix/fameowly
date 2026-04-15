import type { ModelTab } from "./model-list";

interface ModelBannerProps {
  activeTab: ModelTab | null;
}

export function ModelBanner({ activeTab }: ModelBannerProps) {
  if (activeTab === "local") {
    return (
      <div
        className="mx-3 mt-2 mb-2 flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2"
        data-testid="tab-banner-local"
      >
        <span className="shrink-0 text-sm leading-snug">🛡️</span>
        <p className="text-xs text-emerald-400/80 leading-snug">
          Эти модели запущены на собственных серверах fameowly.
          Ваши данные не отправляются иностранным корпорациям.
        </p>
      </div>
    );
  }

  if (activeTab === "world") {
    return (
      <div
        className="mx-3 mt-2 mb-2 flex items-start gap-2 rounded-lg bg-blue-500/10 px-3 py-2"
        data-testid="tab-banner-world"
      >
        <span className="shrink-0 text-sm leading-snug">☁️</span>
        <p className="text-xs text-blue-400/80 leading-snug">
          Доступ через облачные провайдеры Google и OpenRouter.
        </p>
      </div>
    );
  }

  return null;
}
