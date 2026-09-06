import { Film } from "lucide-react";

/** Placeholder screen for the upcoming video generation mode */
export function VideoView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pt-[71px] text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-th-accent-bg">
        <Film className="h-7 w-7 text-th-accent" strokeWidth={1.5} />
      </div>
      <h2 className="text-[24px] font-semibold leading-[1.4] text-th-fg">
        Генерация видео скоро появится
      </h2>
      <p className="max-w-md text-sm text-th-fg-f">
        Мы готовим этот режим. Пока доступны чат и генерация изображений.
      </p>
    </div>
  );
}
