import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeBlock } from "./code-block";

// ─── Component ───────────────────────────────────────────────────────

export function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeStr = String(children).replace(/\n$/, "");
          const isInline = !match && !codeStr.includes("\n");

          if (isInline) {
            return (
              <code
                className="rounded bg-th-subtle/60 px-1.5 py-0.5 text-[0.8125rem] text-th-accent font-mono"
                {...props}
              >
                {children}
              </code>
            );
          }

          return <CodeBlock language={match?.[1] || ""}>{codeStr}</CodeBlock>;
        },
        pre({ children }) {
          return <>{children}</>;
        },
        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto rounded-lg border border-th-border">
              <table className="min-w-full text-sm">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-th-panel/60">{children}</thead>;
        },
        th({ children }) {
          return (
            <th className="border-b border-th-border px-3 py-2 text-left text-xs font-semibold text-th-fg-s">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border-b border-th-border/50 px-3 py-2 text-th-fg-s">
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
              className="text-th-accent underline decoration-th-accent/30 underline-offset-2 hover:decoration-th-accent"
            >
              {children}
            </a>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-3 border-l-3 border-blue-500/50 pl-4 text-th-fg-m italic">
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
