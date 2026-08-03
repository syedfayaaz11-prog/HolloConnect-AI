"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

function CodeBlock({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);

  function onCopy() {
    const text = (children as any)?.props?.children ?? "";
    navigator.clipboard.writeText(String(text).replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative group/code">
      <button
        onClick={onCopy}
        className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[11px] text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-2 py-1 opacity-0 group-hover/code:opacity-100 transition-all"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre {...props}>{children}</pre>
    </div>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none prose-pre:my-2 prose-p:my-1.5 prose-table:text-sm prose-th:text-gray-300 prose-td:border-white/10 prose-th:border-white/10 prose-img:rounded-xl prose-img:my-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ pre: CodeBlock }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
