"use client";

import type { Conversation } from "@/core/types";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  searchQuery: string;
}

function formatRelative(timestamp: number | null): string {
  if (!timestamp) return "";
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} dias`;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  searchQuery,
}: ConversationListProps) {
  const filtered = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      c.phone.includes(q)
    );
  });

  return (
    <aside className="w-full border-r border-navy-500 bg-navy-800 flex flex-col flex-shrink-0 h-full overflow-hidden">
      <div className="p-3 md:p-4 border-b border-navy-500 flex justify-between items-center bg-navy-600 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-geist text-sm md:text-base font-bold text-navy-200">Conversaciones</h2>
          <span className="text-[10px] md:text-xs bg-navy-700 text-ai-green-light px-1.5 md:px-2 py-0.5 rounded-full border border-navy-500 font-mono">
            {filtered.length}
          </span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-1.5 md:space-y-2 custom-scrollbar pb-20 md:pb-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-navy-300 text-sm">
            <span className="material-symbols-outlined text-3xl mb-2 text-navy-400">chat_error</span>
            <p>No hay conversaciones todavia.</p>
          </div>
        )}

        {filtered.map((c) => {
          const isSelected = c.id === selectedId;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`p-2.5 md:p-3 rounded-lg cursor-pointer relative overflow-hidden transition-all group ${
                isSelected
                  ? "bg-navy-700 border border-navy-500 shadow-md"
                  : "hover:bg-navy-600 border border-transparent hover:border-navy-500"
              }`}
            >
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-ai-green-light" />
              )}

              <div className={`flex justify-between items-start mb-0.5 md:mb-1 ${isSelected ? "pl-2" : ""}`}>
                <span className="font-bold text-navy-200 text-xs md:text-sm truncate flex items-center gap-1.5">
                  {c.name ?? `+${c.phone}`}
                  {c.mode === "HUMAN" && (
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-warm" title="Modo Humano" />
                  )}
                </span>
                <span className="text-[10px] md:text-[11px] text-navy-300 ml-2 whitespace-nowrap font-mono">
                  {formatRelative(c.last_message_at)}
                </span>
              </div>

              {c.name && (
                <div className={`text-[10px] md:text-xs text-navy-400 font-mono mb-0.5 md:mb-1 ${isSelected ? "pl-2" : ""}`}>
                  +{c.phone}
                </div>
              )}

              <div className={`flex items-center justify-between ${isSelected ? "pl-2" : ""}`}>
                <p className="text-[10px] md:text-xs text-navy-300 truncate pr-2 leading-tight">
                  {c.last_message_preview ?? "Sin mensajes"}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-[8px] md:text-[10px] uppercase tracking-wider px-1 md:px-1.5 py-0.5 rounded font-semibold ${
                      c.mode === "AI"
                        ? "bg-ai-green-dark text-ai-green-light"
                        : "bg-human-blue text-human-blue-light"
                    }`}
                  >
                    {c.mode}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
