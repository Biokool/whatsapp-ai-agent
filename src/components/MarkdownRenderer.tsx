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
          <h1 className="text-3xl font-bold text-navy-200 mb-6 pb-3 border-b border-navy-500 font-geist">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-bold text-navy-200 mt-8 mb-4 pb-2 border-b border-navy-500/50 font-geist">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold text-navy-200 mt-6 mb-3 font-geist">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-semibold text-navy-200 mt-4 mb-2 font-geist">{children}</h4>
        ),
        p: ({ children }) => <p className="text-navy-200/90 leading-relaxed mb-4">{children}</p>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ai-green-light hover:text-ai-green underline underline-offset-2 transition-colors"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="text-navy-200 font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="text-navy-200/80 italic">{children}</em>,
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code
                className="bg-navy-700 text-ai-green-light px-1.5 py-0.5 rounded text-sm font-mono"
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
          <pre className="bg-navy-900 border border-navy-500 rounded-xl p-4 overflow-x-auto mb-4 custom-scrollbar">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-ai-green/40 pl-4 py-2 mb-4 bg-ai-green/5 rounded-r-lg">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-4 space-y-1 text-navy-200/90">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-4 space-y-1 text-navy-200/90">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4 rounded-lg border border-navy-500">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-navy-700 border-b border-navy-500">{children}</thead>
        ),
        tbody: ({ children }) => <tbody className="divide-y divide-navy-500/50">{children}</tbody>,
        tr: ({ children }) => (
          <tr className="hover:bg-navy-800/50 transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left text-navy-300 font-semibold">{children}</th>
        ),
        td: ({ children }) => <td className="px-4 py-2 text-navy-200/90">{children}</td>,
        hr: () => <hr className="border-navy-500/50 my-8" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
