"use client";

import { MessagesSquare, BarChart3, Filter, GraduationCap, Settings } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  humanRequiredCount: number;
}

const NAV = [
  { tab: "chats", label: "Chats", Icon: MessagesSquare },
  { tab: "analytics", label: "Analisis", Icon: BarChart3 },
  { tab: "funnel", label: "Embudo", Icon: Filter },
  { tab: "knowledge", label: "Knowledge", Icon: GraduationCap },
] as const;

export default function Sidebar({ activeTab, onSelectTab, humanRequiredCount }: SidebarProps) {
  return (
    <nav className="hidden md:flex bg-surface text-primary h-screen w-20 flex-col items-center py-6 border-r border-border fixed left-0 top-0 z-50">
      <div
        onClick={() => onSelectTab("chats")}
        className="mb-8 cursor-pointer flex flex-col items-center group"
        title="Biokool Dashboard"
      >
        <span className="font-display text-2xl font-extrabold text-ai-green tracking-tight group-hover:scale-105 transition-transform">
          BK
        </span>
        <span className="text-[9px] uppercase tracking-widest text-text-subtle font-bold mt-0.5">
          Biokool
        </span>
      </div>

      <div className="flex flex-col gap-5 w-full px-2 mt-2">
        {NAV.map(({ tab, label, Icon }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onSelectTab(tab)}
              className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                active
                  ? "text-ai-green font-bold border-r-2 border-ai-green bg-surface-hover"
                  : "text-text-subtle hover:bg-surface-hover hover:text-ai-green"
              }`}
              title={label}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] mt-1 font-medium">{label}</span>
              {tab === "chats" && humanRequiredCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-warning rounded-full animate-pulse" />
              )}
            </button>
          );
        })}

        <button
          onClick={() => onSelectTab("settings")}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all mt-auto ${
            activeTab === "settings"
              ? "text-ai-green font-bold border-r-2 border-ai-green bg-surface-hover"
              : "text-text-subtle hover:bg-surface-hover hover:text-ai-green"
          }`}
          title="Configuracion"
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-medium">Ajustes</span>
        </button>
      </div>
    </nav>
  );
}
