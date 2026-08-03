"use client";

import { useState } from "react";
import { Search, Bell, User, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

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
    <header className="bg-surface font-display flex justify-between items-center w-full px-3 md:px-8 h-12 md:h-16 border-b border-border backdrop-blur-md z-40 shrink-0">
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        <h1 className="font-display text-base md:text-2xl font-bold text-ai-green flex items-center gap-2 truncate">
          Lead Monitor
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-low text-success border border-success/40">
            WhatsApp Live
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar leads..."
            className="bg-surface-shade border border-border text-sm text-primary placeholder-text-faint rounded-full py-1.5 pl-9 pr-4 focus:outline-none focus:border-focus w-40 lg:w-52 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle hover:text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 border-l border-border pl-2 md:pl-3">
          <button
            className="relative text-text-subtle hover:text-ai-green transition-colors p-1 md:p-1.5 rounded-lg hover:bg-surface-hover"
            title="Notificaciones"
          >
            <Bell className="w-[18px] h-[18px] md:w-[22px] md:h-[22px]" />
            <span className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-ai-green rounded-full shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-surface-hover border border-border flex items-center justify-center ring-2 ring-ai-green/30">
            <User className="text-ai-green w-3.5 h-3.5 md:w-4 md:h-4" />
          </div>
          {phone && (
            <div className="hidden lg:block">
              <div className="text-xs font-medium text-primary">Agente</div>
              <div className="text-[10px] text-text-subtle font-mono">+{phone}</div>
            </div>
          )}
        </div>

        <ThemeToggle />

        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-surface-hover hover:bg-muted text-text-subtle transition-colors disabled:opacity-50 border border-border"
        >
          {disconnecting ? "..." : "Desconectar"}
        </button>
      </div>
    </header>
  );
}
