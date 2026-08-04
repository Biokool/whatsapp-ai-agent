"use client";

import { MessageCircleOff } from "lucide-react";
import type { Conversation } from "@/core/types";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
}

function formatRelative(isoTimestamp: string | null): string {
  if (!isoTimestamp) return "";
  const then = new Date(isoTimestamp).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
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
    return (c.name && c.name.toLowerCase().includes(q)) || c.phone.includes(q);
  });

  return (
    <aside className="w-full md:w-80 lg:w-96 border-r border-border bg-surface flex flex-col flex-shrink-0 h-full overflow-hidden">
      <div className="p-3 md:p-4 border-b border-border flex justify-between items-center bg-surface-hover shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm md:text-base font-bold text-primary">
            Conversaciones
          </h2>
          <span className="text-[10px] md:text-xs bg-surface-hover text-ai-green px-1.5 md:px-2 py-0.5 rounded-full border border-border font-mono">
            {filtered.length}
          </span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-1.5 md:space-y-2 custom-scrollbar pb-20 md:pb-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-subtle text-sm">
            <MessageCircleOff className="w-8 h-8 mx-auto mb-2 text-text-faint" />
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
                  ? "bg-surface-hover border border-border shadow-md"
                  : "hover:bg-surface-shade border border-transparent hover:border-border"
              }`}
            >
              {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-ai-green" />}

              <div
                className={`flex justify-between items-start mb-0.5 md:mb-1 ${isSelected ? "pl-2" : ""}`}
              >
                <span className="font-bold text-primary text-xs md:text-sm truncate flex items-center gap-1.5">
                  {c.name ??
                    (() => {
                      const isLid = c.jid?.endsWith("@lid");
                      const phoneIsHash =
                        isLid && /^\d{10,}$/.test(c.phone) && c.phone.length >= 10;
                      if (isLid && phoneIsHash) return "Contacto WhatsApp";
                      return `+${c.phone}`;
                    })()}
                  {c.mode === "HUMAN" && (
                    <span
                      className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-warning"
                      title="Modo Humano"
                    />
                  )}
                </span>
                <span className="text-[10px] md:text-[11px] text-text-subtle ml-2 whitespace-nowrap font-mono">
                  {formatRelative(c.last_message_at)}
                </span>
              </div>

              {c.name && (
                <div
                  className={`text-[10px] md:text-xs text-text-faint font-mono mb-0.5 md:mb-1 ${isSelected ? "pl-2" : ""}`}
                >
                  {c.jid?.endsWith("@lid") ? "WhatsApp" : `+${c.phone}`}
                </div>
              )}

              <div className={`flex items-center justify-between ${isSelected ? "pl-2" : ""}`}>
                <p className="text-[10px] md:text-xs text-text-subtle truncate pr-2 leading-tight">
                  {c.last_message_preview ?? "Sin mensajes"}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-[8px] md:text-[10px] uppercase tracking-wider px-1 md:px-1.5 py-0.5 rounded font-semibold ${
                      c.mode === "AI"
                        ? "bg-ai-green-low text-ai-green"
                        : "bg-human-blue text-human-blue-contrast"
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
