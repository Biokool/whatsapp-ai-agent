"use client";

interface MessageBubbleProps {
  role: "user" | "assistant" | "human";
  content: string;
  timestamp: number;
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] self-end flex-row-reverse animate-fadeIn">
        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-navy-600 flex items-center justify-center shrink-0 border border-navy-500">
          <span className="material-symbols-outlined text-navy-300 text-[14px] md:text-[18px]">person</span>
        </div>
        <div className="bg-navy-600 border border-navy-500 rounded-2xl rounded-tr-sm p-2.5 md:p-3.5 text-navy-200">
          <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          <span className="text-[9px] md:text-[10px] text-navy-300 mt-1 md:mt-1.5 block font-mono text-right">
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
        <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-ai-green flex items-center justify-center shrink-0 border border-ai-green/40 ai-glow">
          <span className="material-symbols-outlined text-ai-green-dark text-[14px] md:text-[18px]">smart_toy</span>
        </div>
        <div className="bg-ai-green/10 border border-ai-green/30 rounded-2xl rounded-tl-sm p-2.5 md:p-3.5 text-navy-200 shadow-sm">
          <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          <span className="text-[9px] md:text-[10px] text-ai-green-light/80 mt-1 md:mt-1.5 block font-mono">
            IA - {formatTime(timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] self-end flex-row-reverse animate-fadeIn">
      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-human-blue flex items-center justify-center shrink-0 border border-human-blue-light/30">
        <span className="material-symbols-outlined text-human-blue-light text-[14px] md:text-[18px]">support_agent</span>
      </div>
      <div className="bg-human-blue/20 border border-human-blue/50 rounded-2xl rounded-tr-sm p-2.5 md:p-3.5 text-navy-200">
        <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        <span className="text-[9px] md:text-[10px] text-human-blue-light mt-1 md:mt-1.5 block font-mono text-right">
          Humano - {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
