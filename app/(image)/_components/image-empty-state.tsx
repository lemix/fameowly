import { ImageIcon } from "lucide-react";

/** Empty state for image generation mode */
export function ImageEmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20">
        <ImageIcon className="h-7 w-7 text-th-accent" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-th-fg md:text-xl">
          <ImageIcon className="mr-2 inline h-5 w-5 text-th-accent md:h-6 md:w-6" />
          Генерация изображений
        </h2>
        <p className="mt-2 text-sm text-th-fg-f">
          Введите описание и нажмите «Создать»
        </p>
        <p className="mt-1 text-xs text-th-fg-d">
          Можно прикрепить до 10 файлов или вставить через Ctrl+V
        </p>
      </div>
    </div>
  );
}
