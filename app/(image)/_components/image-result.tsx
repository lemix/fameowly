import { Download, Sparkles, Trash2 } from "lucide-react";
import type { ImageHistoryItemClient } from "@/lib/types";

interface ImageResultProps {
  item: ImageHistoryItemClient;
  onPreview: (src: string | null) => void;
  onDelete: (id: string) => void;
  onNewGeneration: () => void;
}

/** Display a generated image with metadata, ref files, and actions */
export function ImageResult({ item, onPreview, onDelete, onNewGeneration }: ImageResultProps) {
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-th-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl!}
          alt={item.prompt}
          className="w-full cursor-pointer transition hover:opacity-90"
          onClick={() => onPreview(item.imageUrl)}
        />
        <div className="border-t border-th-border bg-th-panel/50 px-4 py-3">
          <p className="text-sm text-th-fg-s whitespace-pre-wrap leading-relaxed">
            {item.prompt}
          </p>

          {/* Reference files */}
          {item.referenceFiles && item.referenceFiles.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              <span className="text-[10px] text-th-fg-f w-full mb-0.5">Файлы контекста:</span>
              {item.referenceFiles.map((ref, i) =>
                ref.mimeType.startsWith("image/") ? (
                  <button
                    key={i}
                    onClick={() => onPreview(ref.url)}
                    className="group/ref relative cursor-pointer"
                    title={ref.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ref.url}
                      alt={ref.name}
                      className="h-12 w-12 rounded-lg object-cover border border-th-border-s transition group-hover/ref:border-th-accent group-hover/ref:opacity-80"
                    />
                  </button>
                ) : (
                  <a
                    key={i}
                    href={ref.url}
                    download={ref.name}
                    className="flex items-center gap-1.5 rounded-lg border border-th-border-s bg-th-subtle/50 px-2.5 py-1.5 text-[11px] text-th-fg-m transition hover:border-th-accent hover:text-th-accent"
                    title={`Скачать ${ref.name}`}
                  >
                    <Download className="h-3 w-3" />
                    <span className="max-w-[80px] truncate">{ref.name}</span>
                  </a>
                )
              )}
            </div>
          )}

          {/* Metadata row */}
          <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-th-fg-f">
              <span>{item.modelName}</span>
              <span>•</span>
              {item.aspectRatio && (
                <>
                  <span>{item.aspectRatio}</span>
                  <span>•</span>
                </>
              )}
              {item.resolution && (
                <>
                  <span>{item.resolution}</span>
                  <span>•</span>
                </>
              )}
              <span>
                {item.createdAt.toLocaleString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={item.imageUrl!}
                download={`image-${item.id}.png`}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-th-fg-m transition cursor-pointer hover:bg-th-subtle hover:text-th-fg"
                title="Скачать"
              >
                <Download className="h-3.5 w-3.5" />
                Скачать
              </a>
              <button
                onClick={() => onDelete(item.id)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-th-fg-m transition cursor-pointer hover:bg-red-500/10 hover:text-red-400"
                title="Удалить"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA to create new */}
      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <button
          onClick={onNewGeneration}
          className="flex items-center gap-2 rounded-xl bg-th-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-th-accent-muted"
        >
          <Sparkles className="h-4 w-4" />
          Создать новое изображение
        </button>
        <p className="text-xs text-th-fg-f">
          Или выберите другое изображение в истории
        </p>
      </div>
    </>
  );
}
