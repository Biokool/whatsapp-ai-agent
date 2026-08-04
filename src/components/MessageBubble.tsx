"use client";

import { User, Bot, Headphones } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant" | "human";
  content: string;
  timestamp: string;
}

function formatTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] self-end flex-row-reverse animate-fadeIn">
        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-surface-hover flex items-center justify-center shrink-0 border border-border">
          <User className="w-4 h-4 md:w-[18px] md:h-[18px] text-text-subtle" />
        </div>
        <div className="bg-surface-hover border border-border rounded-2xl rounded-tr-sm p-2.5 md:p-3.5 text-primary">
          <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          <span className="text-[9px] md:text-[10px] text-text-subtle mt-1 md:mt-1.5 block font-mono text-right">
            {formatTime(timestamp)}
          </span>
        </div>
      </div>
    );
  }

  const isAI = role === "assistant";

  if (isAI) {
    return (
      <div className="flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] animate-fadeIn">
        <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-ai-green flex items-center justify-center shrink-0 border border-ai-green/40">
          <Bot className="w-4 h-4 md:w-[18px] md:h-[18px] text-ai-green-contrast" />
        </div>
        <div className="bg-ai-green-low border border-ai-green/40 rounded-2xl rounded-tl-sm p-2.5 md:p-3.5 text-primary shadow-sm">
          <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          <span className="text-[9px] md:text-[10px] text-ai-green mt-1 md:mt-1.5 block font-mono">
            IA - {formatTime(timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] self-end flex-row-reverse animate-fadeIn">
      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-human-blue flex items-center justify-center shrink-0 border border-human-blue/50">
        <Headphones className="w-4 h-4 md:w-[18px] md:h-[18px] text-human-blue-contrast" />
      </div>
      <div className="bg-human-blue-low border border-human-blue/50 rounded-2xl rounded-tr-sm p-2.5 md:p-3.5 text-primary">
        <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        <span className="text-[9px] md:text-[10px] text-human-blue mt-1 md:mt-1.5 block font-mono text-right">
          Humano - {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
