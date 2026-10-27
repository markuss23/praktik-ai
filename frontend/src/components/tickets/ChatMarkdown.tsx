"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Wiki agent odpovídá markdownem (`*text*`, seznamy, odkazy) a řádky zalamuje
 * jednoduchým `\n`. Markdown by takové zalomení spolkl, proto z osamoceného
 * `\n` uděláme tvrdý zlom (dvě mezery na konci řádku).
 */
function withHardBreaks(text: string): string {
  return text.replace(/([^\n])\n(?!\n)/g, "$1  \n");
}

/** Markdown v bublině chatu — kompaktní rozestupy, styl podle zbytku appky. */
export function ChatMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => (
          <ul className="mb-2 last:mb-0 list-disc space-y-1 pl-5 marker:text-[var(--gradient-r)]">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 last:mb-0 list-decimal space-y-1 pl-5 marker:text-[var(--gradient-r)]">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => (
          <p className="mb-1.5 mt-3 first:mt-0 text-sm font-semibold">{children}</p>
        ),
        h2: ({ children }) => (
          <p className="mb-1.5 mt-3 first:mt-0 text-sm font-semibold">{children}</p>
        ),
        h3: ({ children }) => (
          <p className="mb-1.5 mt-3 first:mt-0 text-sm font-semibold">{children}</p>
        ),
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--gradient-l)] underline decoration-[var(--gradient-l)]/30 underline-offset-2 transition-colors hover:decoration-[var(--gradient-l)]"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--gradient-l)]">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="mb-2 last:mb-0 overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-[var(--gradient-r)] pl-3 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-3 border-border" />,
      }}
    >
      {withHardBreaks(text)}
    </ReactMarkdown>
  );
}
