"use client";

import { Bot, User } from "lucide-react";

interface ModeToggleProps {
  mode: "AI" | "HUMAN";
  onChange: (mode: "AI" | "HUMAN") => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center bg-surface-shade rounded-full p-0.5 border border-border">
      <button
        onClick={() => onChange("AI")}
        className={`px-2 md:px-3.5 py-1 rounded-full font-display text-[10px] md:text-xs font-bold flex items-center gap-1 transition-all ${
          mode === "AI"
            ? "bg-ai-green text-ai-green-contrast shadow-sm"
            : "text-text-subtle hover:text-primary"
        }`}
      >
        <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span className="hidden sm:inline">IA</span>
      </button>
      <button
        onClick={() => onChange("HUMAN")}
        className={`px-2 md:px-3.5 py-1 rounded-full font-display text-[10px] md:text-xs font-bold flex items-center gap-1 transition-all ${
          mode === "HUMAN"
            ? "bg-human-blue text-human-blue-contrast shadow-sm"
            : "text-text-subtle hover:text-primary"
        }`}
      >
        <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span className="hidden sm:inline">Humano</span>
      </button>
    </div>
  );
}
