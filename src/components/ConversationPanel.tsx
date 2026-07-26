"use client";

import { useEffect, useRef, useState } from "react";
import type { Conversation } from "@/core/types";
import MessageBubble from "./MessageBubble";
import ModeToggle from "./ModeToggle";
import { useMessages } from "@/hooks/use-messages";
import { useSendMessage } from "@/hooks/use-send-message";
import { useModeToggle } from "@/hooks/use-mode";
import { useDeleteConversation } from "@/hooks/use-delete-conversation";

interface ConversationPanelProps {
  conversation: Conversation | null;
  onBack?: () => void;
}

export default function ConversationPanel({
  conversation,
  onBack,
}: ConversationPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useMessages(conversation?.id ?? null);
  const sendMessage = useSendMessage();
  const modeToggle = useModeToggle();
  const deleteConversation = useDeleteConversation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleModeChange(newMode: "AI" | "HUMAN") {
    if (!conversation) return;
    modeToggle.mutate({ conversationId: conversation.id, mode: newMode });
  }

  function handleSend() {
    if (!conversation || !input.trim() || sendMessage.isPending) return;
    sendMessage.mutate(
      { conversationId: conversation.id, content: input.trim() },
      { onSuccess: () => setInput("") }
    );
  }

  function handleDelete() {
    if (!conversation) return;
    const confirmed = window.confirm(
      `Borrar la conversacion con ${conversation.name ?? `+${conversation.phone}`}? Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;
    deleteConversation.mutate(conversation.id);
  }

  if (!conversation) {
    return (
      <section className="flex-1 flex flex-col min-w-0 bg-navy-950 h-full">
        <div className="flex items-center justify-center h-full text-navy-400 text-sm">
          Selecciona una conversacion
        </div>
      </section>
    );
  }

  const isHuman = conversation.mode === "HUMAN";

  return (
    <section className="flex-1 flex flex-col min-w-0 bg-navy-950 h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 md:px-6 py-2.5 md:py-3.5 border-b border-navy-500 flex flex-wrap justify-between items-center bg-navy-800/80 backdrop-blur-sm z-10 gap-2 md:gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden text-navy-300 hover:text-ai-green-light p-1 -ml-1"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
          )}
          <div className="min-w-0">
            <h2 className="font-geist text-base md:text-xl font-bold text-navy-200 flex items-center gap-2 truncate">
              {conversation.name ?? `+${conversation.phone}`}
            </h2>
            <div className="flex items-center gap-2 md:gap-3 mt-0.5 text-[11px] md:text-xs text-navy-300">
              <span className="font-mono bg-navy-600 px-1.5 md:px-2 py-0.5 rounded text-navy-200">
                +{conversation.phone}
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isHuman ? "bg-amber-warm" : "bg-ai-green-light"}`} />
                <span className="hidden sm:inline">Modo:</span> <strong className="text-navy-200">{isHuman ? "Humano" : "IA"}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <ModeToggle mode={conversation.mode} onChange={handleModeChange} />
          <button
            onClick={handleDelete}
            className="text-red-alert hover:bg-red-dark/20 p-1.5 md:px-3 md:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            title="Eliminar conversacion"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span className="hidden md:inline">Borrar</span>
          </button>
        </div>
      </div>

      {/* Messages - scrollable area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar"
      >
        <div className="flex flex-col gap-3 md:gap-4 max-w-3xl mx-auto pb-2">
          {messages.length === 0 && (
            <div className="text-center text-sm text-navy-400 py-10">
              Sin mensajes todavia
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              timestamp={m.created_at}
            />
          ))}
        </div>
      </div>

      {/* Bottom bar - part of flex flow, never overlaps */}
      <div className="shrink-0 px-3 md:px-4 py-2.5 md:py-3 bg-navy-800/95 backdrop-blur-md border-t border-navy-500 z-20">
        {isHuman ? (
          <div className="flex gap-2 max-w-3xl mx-auto items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribe tu respuesta..."
              rows={2}
              className="flex-1 bg-navy-900 border border-navy-500 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-sm resize-none focus:outline-none focus:border-ai-green-light text-navy-200 placeholder-navy-400 min-h-[44px]"
            />
            <button
              onClick={handleSend}
              disabled={sendMessage.isPending || !input.trim()}
              className="bg-ai-green hover:bg-ai-green-light text-ai-green-dark disabled:opacity-50 font-bold px-3 md:px-4 py-2 md:py-2.5 rounded-lg flex items-center gap-1 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        ) : (
          <div className="text-center text-[11px] md:text-xs text-navy-400 py-1.5 md:py-2">
            El agente IA responde automaticamente. Cambia a <strong>Modo Humano</strong> para escribir tu.
          </div>
        )}
      </div>
    </section>
  );
}
