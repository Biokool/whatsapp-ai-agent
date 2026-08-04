"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold text-primary mb-6 pb-3 border-b border-border font-display">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-bold text-primary mt-8 mb-4 pb-2 border-b border-border font-display">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold text-primary mt-6 mb-3 font-display">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-semibold text-primary mt-4 mb-2 font-display">{children}</h4>
        ),
        p: ({ children }) => <p className="text-primary leading-relaxed mb-4">{children}</p>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ai-green hover:text-ai-green underline underline-offset-2 transition-colors"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="text-primary font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="text-primary/80 italic">{children}</em>,
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code
                className="bg-surface-hover text-ai-green px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-surface border border-border rounded-xl p-4 overflow-x-auto mb-4 custom-scrollbar">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-ai-green/40 pl-4 py-2 mb-4 bg-ai-green-low rounded-r-lg">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-4 space-y-1 text-primary">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-4 space-y-1 text-primary">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4 rounded-lg border border-border">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-surface-hover border-b border-border">{children}</thead>
        ),
        tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
        tr: ({ children }) => (
          <tr className="hover:bg-surface-shade transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left text-text-subtle font-semibold">{children}</th>
        ),
        td: ({ children }) => <td className="px-4 py-2 text-primary">{children}</td>,
        hr: () => <hr className="border-border my-8" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
