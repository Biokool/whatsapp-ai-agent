"use client";

interface ModeToggleProps {
  mode: "AI" | "HUMAN";
  onChange: (mode: "AI" | "HUMAN") => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center bg-navy-700 rounded-full p-0.5 border border-navy-500">
      <button
        onClick={() => onChange("AI")}
        className={`px-2 md:px-3.5 py-1 rounded-full font-geist text-[10px] md:text-xs font-bold flex items-center gap-1 transition-all ${
          mode === "AI"
            ? "bg-ai-green text-ai-green-dark shadow-sm"
            : "text-navy-300 hover:text-navy-200"
        }`}
      >
        <span className="material-symbols-outlined text-[14px] md:text-[16px]">smart_toy</span>
        <span className="hidden sm:inline">IA</span>
      </button>
      <button
        onClick={() => onChange("HUMAN")}
        className={`px-2 md:px-3.5 py-1 rounded-full font-geist text-[10px] md:text-xs font-bold flex items-center gap-1 transition-all ${
          mode === "HUMAN"
            ? "bg-human-blue text-human-blue-light shadow-sm"
            : "text-navy-300 hover:text-navy-200"
        }`}
      >
        <span className="material-symbols-outlined text-[14px] md:text-[16px]">person</span>
        <span className="hidden sm:inline">Humano</span>
      </button>
    </div>
  );
}
