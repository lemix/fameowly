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
        <p className="text-xs text-th-emerald-fg leading-snug">
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
        <p className="text-xs text-th-accent leading-snug">
          Доступ через облачные провайдеры Google и OpenRouter.
        </p>
      </div>
    );
  }

  return null;
}
