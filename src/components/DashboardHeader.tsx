"use client";

import { useState } from "react";

interface DashboardHeaderProps {
  phone: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function DashboardHeader({
  phone,
  searchQuery,
  onSearchChange,
}: DashboardHeaderProps) {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    const confirmed = confirm(
      "Seguro que quieres desconectar? Tendras que escanear el QR otra vez."
    );
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      await fetch("/api/connection/disconnect", { method: "POST" });
      window.location.reload();
    } catch {
      setDisconnecting(false);
      alert("Error al desconectar. Intentalo de nuevo.");
    }
  }

  return (
    <header className="bg-navy-800 font-geist flex justify-between items-center w-full px-3 md:px-8 h-12 md:h-16 border-b border-navy-500 backdrop-blur-md z-40 shrink-0">
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        <h1 className="font-geist text-base md:text-2xl font-bold text-ai-green-light flex items-center gap-2 truncate">
          Lead Monitor
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ai-green/20 text-ai-green-light border border-ai-green/40">
            WhatsApp Live
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <div className="relative hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-navy-300 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar leads..."
            className="bg-navy-700 border border-navy-500 text-sm text-navy-200 placeholder-navy-400 rounded-full py-1.5 pl-9 pr-4 focus:outline-none focus:border-ai-green-light w-40 lg:w-52 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-300 hover:text-white"
            >
              x
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 border-l border-navy-500 pl-2 md:pl-3">
          <button
            className="relative text-navy-300 hover:text-ai-green-light transition-colors p-1 md:p-1.5 rounded-lg hover:bg-navy-700"
            title="Notificaciones"
          >
            <span className="material-symbols-outlined text-[18px] md:text-[22px]">
              notifications
            </span>
            <span className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-ai-green-light rounded-full ai-glow" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-navy-600 border border-navy-500 flex items-center justify-center ring-2 ring-ai-green-light/30">
            <span className="material-symbols-outlined text-ai-green-light text-[14px] md:text-[18px]">
              person
            </span>
          </div>
          {phone && (
            <div className="hidden lg:block">
              <div className="text-xs font-medium text-navy-200">Agente</div>
              <div className="text-[10px] text-navy-400 font-mono">+{phone}</div>
            </div>
          )}
        </div>

        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-navy-300 transition-colors disabled:opacity-50 border border-navy-500"
        >
          {disconnecting ? "..." : "Desconectar"}
        </button>
      </div>
    </header>
  );
}
