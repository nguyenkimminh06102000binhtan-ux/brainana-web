"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface Props {
  content: string;
  role: "user" | "assistant";
}

export default function ChatMessage({ content, role }: Props) {
  if (role === "user") {
    return <span>{content}</span>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-[700]">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
        li: ({ children }) => <li className="mb-0.5">{children}</li>,
        hr: () => <hr className="my-2 border-ink/20" />,
        code: ({ children }) => (
          <code className="rounded bg-ink/10 px-1 py-0.5 font-mono text-xs">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
