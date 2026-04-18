"use client";

import { useState, useSyncExternalStore } from "react";
import { Copy, Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

// ─── Dark class observer ─────────────────────────────────────────────

function subscribeToDark(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function getIsDark() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

function getServerSnapshot() { return true; }

// ─── Types ───────────────────────────────────────────────────────────

interface CodeBlockProps {
  language: string;
  children: string;
}

// ─── Component ───────────────────────────────────────────────────────

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const isDark = useSyncExternalStore(subscribeToDark, getIsDark, getServerSnapshot);

  function handleCopy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-th-border bg-th-code">
      <div className="flex items-center justify-between border-b border-th-border bg-th-code-header/80 px-4 py-1.5">
        <span className="text-xs font-medium text-th-fg-m">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-th-fg-m transition hover:bg-th-subtle hover:text-th-fg-s"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-th-green" />
              <span className="text-th-green">Скопировано</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Копировать</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language || "text"}
          style={isDark ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontSize: "0.8125rem",
            lineHeight: "1.6",
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
