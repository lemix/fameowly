"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { ChatAttachment } from "@/lib/types";
import { ImagePreviewModal } from "@/components/image-preview-modal";

// ─── Component ───────────────────────────────────────────────────────

export function AttachmentPreview({ attachments }: { attachments: ChatAttachment[] }) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-2">
        {attachments.map((att, i) => (
          <div key={i} className="relative">
            {att.type === "image" ? (
              <button
                onClick={() => setPreviewSrc(att.url)}
                className="group/att cursor-pointer"
                title={att.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.url}
                  alt={att.name}
                  className="h-20 w-20 rounded-lg object-cover border border-th-border-s transition group-hover/att:border-th-accent group-hover/att:opacity-80"
                />
              </button>
            ) : (
              <a
                href={att.url}
                download={att.name}
                className="flex items-center gap-2 rounded-lg border border-th-border-s bg-th-subtle/50 px-3 py-2 text-xs text-th-fg-s transition hover:border-th-accent hover:text-th-accent"
                title={`Скачать ${att.name}`}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="max-w-[120px] truncate">{att.name}</span>
              </a>
            )}
          </div>
        ))}
      </div>
      <ImagePreviewModal
        open={previewSrc !== null}
        src={previewSrc || ""}
        alt="Attachment preview"
        onClose={() => setPreviewSrc(null)}
      />
    </>
  );
}
