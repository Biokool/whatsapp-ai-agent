"use client";

import { useEffect, useState } from "react";

interface QRScreenProps {
  status: "disconnected" | "qr" | "connecting" | "unknown";
  qrPng: string | null;
}

export default function QRScreen({ status, qrPng }: QRScreenProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Conectar WhatsApp</h1>
          <p className="text-sm text-neutral-400">
            Escanea el código con tu WhatsApp para conectar el agente
          </p>
        </header>

        {qrPng && (
          <div className="bg-white p-4 rounded-xl flex items-center justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrPng} alt="Código QR para conectar WhatsApp" className="w-full h-auto max-w-xs" />
          </div>
        )}

        {!qrPng && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl aspect-square flex items-center justify-center mb-6">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-neutral-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-neutral-500">
                {status === "connecting" && "Conectando..."}
                {status === "disconnected" && "Esperando al bot..."}
                {status === "unknown" && "Cargando..."}
                {status === "qr" && "Generando QR..."}
              </p>
            </div>
          </div>
        )}

        <div className="text-xs text-neutral-500 space-y-2">
          <p className="font-medium text-neutral-300">Cómo escanear:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Abre WhatsApp en tu móvil</li>
            <li>Configuración → Dispositivos vinculados</li>
            <li>Toca <strong>Vincular un dispositivo</strong></li>
            <li>Escanea el QR de esta pantalla</li>
          </ol>
        </div>

        {elapsed > 60 && (
          <div className="mt-6 p-3 bg-amber-950/50 border border-amber-900 rounded-lg text-sm text-amber-200">
            ¿Llevas más de 1 minuto? El QR puede haber caducado. Recarga la página.
          </div>
        )}
      </div>
    </main>
  );
}
