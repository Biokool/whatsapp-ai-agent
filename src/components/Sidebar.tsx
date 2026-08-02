"use client";

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  humanRequiredCount: number;
}

export default function Sidebar({ activeTab, onSelectTab, humanRequiredCount }: SidebarProps) {
  return (
    <nav className="hidden md:flex bg-navy-900 text-navy-200 h-screen w-20 flex-col items-center py-6 border-r border-navy-500 fixed left-0 top-0 z-50">
      <div
        onClick={() => onSelectTab("chats")}
        className="mb-8 cursor-pointer flex flex-col items-center group"
        title="Biokool Dashboard"
      >
        <span className="font-geist text-2xl font-extrabold text-ai-green-light tracking-tight group-hover:scale-105 transition-transform">
          BK
        </span>
        <span className="text-[9px] uppercase tracking-widest text-navy-300 font-bold mt-0.5">
          Biokool
        </span>
      </div>

      <div className="flex flex-col gap-5 w-full px-2 mt-2">
        <button
          onClick={() => onSelectTab("chats")}
          className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
            activeTab === "chats"
              ? "text-ai-green-light font-bold border-r-2 border-ai-green-light bg-navy-600"
              : "text-navy-300 hover:bg-navy-700 hover:text-ai-green-light"
          }`}
          title="Chats y Conversaciones"
        >
          <span className="material-symbols-outlined text-[24px]">chat</span>
          <span className="text-[10px] mt-1 font-medium">Chats</span>
          {humanRequiredCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-warm rounded-full animate-pulse" />
          )}
        </button>

        <button
          onClick={() => onSelectTab("analytics")}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
            activeTab === "analytics"
              ? "text-ai-green-light font-bold border-r-2 border-ai-green-light bg-navy-600"
              : "text-navy-300 hover:bg-navy-700 hover:text-ai-green-light"
          }`}
          title="Metricas y Analisis"
        >
          <span className="material-symbols-outlined text-[24px]">insights</span>
          <span className="text-[10px] mt-1 font-medium">Analisis</span>
        </button>

        <button
          onClick={() => onSelectTab("funnel")}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
            activeTab === "funnel"
              ? "text-ai-green-light font-bold border-r-2 border-ai-green-light bg-navy-600"
              : "text-navy-300 hover:bg-navy-700 hover:text-ai-green-light"
          }`}
          title="Tablero Kanban de Embudo"
        >
          <span className="material-symbols-outlined text-[24px]">filter_alt</span>
          <span className="text-[10px] mt-1 font-medium">Embudo</span>
        </button>

        <button
          onClick={() => onSelectTab("knowledge")}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
            activeTab === "knowledge"
              ? "text-ai-green-light font-bold border-r-2 border-ai-green-light bg-navy-600"
              : "text-navy-300 hover:bg-navy-700 hover:text-ai-green-light"
          }`}
          title="Knowledge Base"
        >
          <span className="material-symbols-outlined text-[24px]">school</span>
          <span className="text-[10px] mt-1 font-medium">Knowledge</span>
        </button>

        <button
          onClick={() => onSelectTab("settings")}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all mt-auto ${
            activeTab === "settings"
              ? "text-ai-green-light font-bold border-r-2 border-ai-green-light bg-navy-600"
              : "text-navy-300 hover:bg-navy-700 hover:text-ai-green-light"
          }`}
          title="Configuracion"
        >
          <span className="material-symbols-outlined text-[24px]">settings</span>
          <span className="text-[10px] mt-1 font-medium">Ajustes</span>
        </button>
      </div>
    </nav>
  );
}
