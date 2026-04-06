"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// ─── Types ───────────────────────────────────────────────────────────

interface CodeBlockProps {
  language: string;
  children: string;
}

// ─── Component ───────────────────────────────────────────────────────

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-slate-700 bg-[#1e1e2e]">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/80 px-4 py-1.5">
        <span className="text-xs font-medium text-slate-400">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" />
              <span className="text-green-400">Скопировано</span>
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
          style={oneDark}
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
