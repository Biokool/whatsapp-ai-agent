"use client";

import { useEffect, useState } from "react";

interface QRScreenProps {
  status: "disconnected" | "qr" | "connecting" | "unknown";
  qrPng: string | null;
}

export default function QRScreen({ status, qrPng }: QRScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleReset() {
    if (!confirm("Esto borrará la sesión de WhatsApp y generará un QR nuevo. Continuar?")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        // Reload after a short delay so the bot restarts
        setTimeout(() => window.location.reload(), 2000);
      } else {
        alert("Error al resetear: " + (data.error ?? "desconocido"));
        setResetting(false);
      }
    } catch {
      alert("Error de red al intentar resetear.");
      setResetting(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 shadow-2xl">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Conectar WhatsApp</h1>
          <p className="text-sm text-text-subtle">
            Escanea el código con tu WhatsApp para conectar el agente
          </p>
        </header>

        {qrPng && (
          <div className="bg-white p-4 rounded-xl flex items-center justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrPng}
              alt="Código QR para conectar WhatsApp"
              className="w-full h-auto max-w-xs"
            />
          </div>
        )}

        {!qrPng && (
          <div className="bg-canvas border border-border rounded-xl aspect-square flex items-center justify-center mb-6">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-border border-t-ai-green rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-faint">
                {status === "connecting" && "Conectando..."}
                {status === "disconnected" && "Esperando al bot..."}
                {status === "unknown" && "Cargando..."}
                {status === "qr" && "Generando QR..."}
              </p>
            </div>
          </div>
        )}

        <div className="text-xs text-text-faint space-y-2">
          <p className="font-medium text-primary">Cómo escanear:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Abre WhatsApp en tu móvil</li>
            <li>Configuración → Dispositivos vinculados</li>
            <li>
              Toca <strong>Vincular un dispositivo</strong>
            </li>
            <li>Escanea el QR de esta pantalla</li>
          </ol>
        </div>

        {(elapsed > 30 || status === "disconnected") && (
          <div className="mt-6 space-y-3">
            {elapsed > 60 && (
              <div className="p-3 bg-warning-low border border-warning/50 rounded-lg text-sm text-warning">
                ¿Llevas más de 1 minuto? El QR puede haber caducado.
              </div>
            )}
            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full py-2.5 rounded-lg bg-success hover:bg-success/85 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting ? "Reseteando sesión..." : "Resetear sesión (QR nuevo)"}
            </button>
            <p className="text-[11px] text-text-faint text-center">
              Borra la sesión guardada y genera un QR fresco
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
