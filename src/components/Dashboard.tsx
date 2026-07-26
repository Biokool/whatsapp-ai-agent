"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import ConversationList from "./ConversationList";
import ConversationPanel from "./ConversationPanel";
import { useConversations } from "@/hooks/use-conversations";

interface DashboardProps {
  phone: string | null;
}

export default function Dashboard({ phone }: DashboardProps) {
  const { data: conversations = [] } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("chats");
  const [searchQuery, setSearchQuery] = useState("");

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const humanRequiredCount = conversations.filter((c) => c.mode === "HUMAN").length;

  const showConversationList = selectedId === null;

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      {/* Desktop sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} humanRequiredCount={humanRequiredCount} />

      <div className="flex-1 flex flex-col md:ml-20 overflow-hidden">
        <DashboardHeader phone={phone} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <div className="flex-1 flex overflow-hidden">
          {/* ConversationList - hidden on mobile when conversation is selected */}
          <div className={`${showConversationList ? "flex" : "hidden"} md:flex flex-1 md:flex-none`}>
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              searchQuery={searchQuery}
            />
          </div>

          {/* ConversationPanel - hidden on mobile when no conversation selected */}
          <div className={`${showConversationList ? "hidden" : "flex"} md:flex flex-1`}>
            <ConversationPanel
              conversation={selected}
              onBack={() => setSelectedId(null)}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-900 border-t border-navy-500 z-50 px-2 py-1.5 safe-area-bottom">
        <div className="flex justify-around items-center">
          <button
            onClick={() => { setActiveTab("chats"); setSelectedId(null); }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
              activeTab === "chats"
                ? "text-ai-green-light"
                : "text-navy-400"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            <span className="text-[9px] font-medium">Chats</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
              activeTab === "analytics"
                ? "text-ai-green-light"
                : "text-navy-400"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">insights</span>
            <span className="text-[9px] font-medium">Analisis</span>
          </button>

          <button
            onClick={() => setActiveTab("funnel")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all relative ${
              activeTab === "funnel"
                ? "text-ai-green-light"
                : "text-navy-400"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">filter_alt</span>
            <span className="text-[9px] font-medium">Embudo</span>
            {humanRequiredCount > 0 && (
              <span className="absolute top-0.5 right-2 w-2 h-2 bg-amber-warm rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
              activeTab === "settings"
                ? "text-ai-green-light"
                : "text-navy-400"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-[9px] font-medium">Ajustes</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
