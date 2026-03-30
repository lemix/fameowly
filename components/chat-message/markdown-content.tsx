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
                className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[0.8125rem] text-blue-300 font-mono"
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
