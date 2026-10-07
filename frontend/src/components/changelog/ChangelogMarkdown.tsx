import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Sdílené stylování markdownu changelogu (laděné do designu appky).
// Používá ho jak accordion na úvodní stránce, tak samostatná stránka /changelog.
export function ChangelogMarkdown({ markdown }: { markdown: string }) {
  return (
    <article className="changelog-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-8 first:mt-0 mb-4 pb-2 border-b border-border">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-8 first:mt-0 mb-3 flex items-center gap-2">
              <span
                className="inline-block w-1.5 h-6 rounded-full"
                style={{ background: "linear-gradient(180deg, var(--gradient-l) 0%, var(--gradient-r) 100%)" }}
              />
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-lg font-semibold text-foreground mt-6 mb-2">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-foreground leading-relaxed mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-1.5 mb-4 text-foreground marker:text-[var(--gradient-r)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-1.5 mb-4 text-foreground marker:text-[var(--gradient-r)]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gradient-l)] font-medium underline decoration-[var(--gradient-l)]/30 underline-offset-2 hover:decoration-[var(--gradient-l)] transition-colors"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-muted text-[var(--gradient-l)] text-sm font-mono">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[var(--gradient-r)] pl-4 italic text-muted-foreground my-4">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-border" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
