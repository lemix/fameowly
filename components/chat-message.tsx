"use client";

import { useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Bot,
  User,
  Copy,
  Check,
  ChevronDown,
  Brain,
  XCircle,
  Loader2,
  Trash2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "@/lib/chat-store";

// ─── Types ───────────────────────────────────────────────────────────

export interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  error?: string;
  attachments?: ChatAttachment[];
  createdAt?: Date | string;
}

interface ChatMessageProps {
  message: MessageData;
  isLoading?: boolean;
  isStreaming?: boolean;
  onDelete?: (messageId: string) => void;
}

// ─── Code Block with Copy ────────────────────────────────────────────

function CodeBlock({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
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
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

// ─── Markdown Renderer ───────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeStr = String(children).replace(/\n$/, "");

          // Check if this is an inline code or a block
          const isInline = !match && !codeStr.includes("\n");

          if (isInline) {
            return (
              <code
                className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[0.8125rem] text-blue-300 font-mono"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <CodeBlock language={match?.[1] || ""}>
              {codeStr}
            </CodeBlock>
          );
        },
        pre({ children }) {
          // We handle code blocks in the code component
          return <>{children}</>;
        },
        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto rounded-lg border border-slate-700">
              <table className="min-w-full text-sm">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-slate-800/60">{children}</thead>;
        },
        th({ children }) {
          return (
            <th className="border-b border-slate-700 px-3 py-2 text-left text-xs font-semibold text-slate-300">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border-b border-slate-700/50 px-3 py-2 text-slate-300">
              {children}
            </td>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline decoration-blue-400/30 underline-offset-2 hover:decoration-blue-400"
            >
              {children}
            </a>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-3 border-l-3 border-blue-500/50 pl-4 text-slate-400 italic">
              {children}
            </blockquote>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ─── Attachment Preview ──────────────────────────────────────────────

function AttachmentPreview({
  attachments,
}: {
  attachments: ChatAttachment[];
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((att, i) => (
        <div key={i} className="relative">
          {att.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={att.url}
              alt={att.name}
              className="h-20 w-20 rounded-lg object-cover border border-slate-600"
            />
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-xs text-slate-300">
              <ImageIcon className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">{att.name}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

const ChatMessage = memo(function ChatMessage({
  message: m,
  isLoading,
  isStreaming,
  onDelete,
}: ChatMessageProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleCopyMessage() {
    navigator.clipboard.writeText(m.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isUser = m.role === "user";

  return (
    <div
      className={cn(
        "group/msg mb-4 flex gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 mt-0.5">
          <Bot className="h-3.5 w-3.5 text-blue-400" />
        </div>
      )}

      <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start", "max-w-[85%] lg:max-w-[75%]")}>
        {/* Attachments */}
        {m.attachments && m.attachments.length > 0 && (
          <AttachmentPreview attachments={m.attachments} />
        )}

        {/* Reasoning block */}
        {!isUser && m.reasoning && (
          <div className="w-full rounded-lg border border-purple-500/20 bg-purple-500/5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-purple-300 hover:text-purple-200 transition"
            >
              <Brain className="h-3 w-3" />
              <span>Размышления</span>
              <ChevronDown
                className={cn(
                  "ml-auto h-3 w-3 transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </button>
            {expanded && (
              <div className="border-t border-purple-500/20 px-3 py-2 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {m.reasoning}
              </div>
            )}
          </div>
        )}

        {/* Error block */}
        {!isUser && m.error && (
          <div className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-red-400">
              <XCircle className="h-3 w-3 shrink-0" />
              <span>{m.error}</span>
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-blue-600 text-white"
              : "bg-slate-800 text-slate-200 border border-slate-700/60"
          )}
        >
          {!isUser ? (
            m.content ? (
              <div className="prose prose-invert prose-sm max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5">
                <MarkdownContent content={m.content} />
              </div>
            ) : (isLoading || isStreaming) ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Генерация ответа...</span>
              </div>
            ) : m.error ? null : (
              <div className="text-slate-500 italic text-xs">Пустой ответ</div>
            )
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
          )}
        </div>

        {/* Action bar for assistant messages */}
        {!isUser && m.content && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyMessage}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition"
              title="Копировать Markdown"
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
            {onDelete && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 group-hover/msg:opacity-100 hover:text-red-400 hover:bg-slate-700/50 transition"
                title="Удалить сообщение"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {onDelete && confirmDelete && (
              <div className="flex items-center gap-1 ml-1 rounded-md bg-slate-700/50 px-2 py-1">
                <span className="text-xs text-red-400">Удалить?</span>
                <button
                  onClick={() => { onDelete(m.id); setConfirmDelete(false); }}
                  className="rounded p-0.5 text-red-400 hover:bg-red-500/20 transition"
                  title="Подтвердить удаление"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-600 transition"
                  title="Отмена"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action bar for user messages */}
        {isUser && onDelete && (
          <div className="flex items-center gap-1">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 group-hover/msg:opacity-100 hover:text-red-400 hover:bg-slate-700/50 transition"
                title="Удалить сообщение"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            ) : (
              <div className="flex items-center gap-1 rounded-md bg-slate-700/50 px-2 py-1">
                <span className="text-xs text-red-400">Удалить?</span>
                <button
                  onClick={() => { onDelete(m.id); setConfirmDelete(false); }}
                  className="rounded p-0.5 text-red-400 hover:bg-red-500/20 transition"
                  title="Подтвердить"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-600 transition"
                  title="Отмена"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-700 mt-0.5">
          <User className="h-3.5 w-3.5 text-slate-300" />
        </div>
      )}
    </div>
  );
});

export default ChatMessage;
