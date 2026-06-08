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
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-8 first:mt-0 mb-4 pb-2 border-b border-gray-100">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-8 first:mt-0 mb-3 flex items-center gap-2">
              <span
                className="inline-block w-1.5 h-6 rounded-full"
                style={{ background: "linear-gradient(180deg, #B1475C 0%, #857AD2 100%)" }}
              />
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-lg font-semibold text-gray-900 mt-6 mb-2">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-1.5 mb-4 text-gray-700 marker:text-[#857AD2]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-1.5 mb-4 text-gray-700 marker:text-[#857AD2]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#B1475C] font-medium underline decoration-[#B1475C]/30 underline-offset-2 hover:decoration-[#B1475C] transition-colors"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-gray-100 text-[#B1475C] text-sm font-mono">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#857AD2] pl-4 italic text-gray-600 my-4">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-gray-100" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
