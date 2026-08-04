"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function N8nSettings() {
  const qc = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [gdriveFolder, setGdriveFolder] = useState("");

  const { data: config, isLoading } = useQuery({
    queryKey: ["n8n-config"],
    queryFn: async () => {
      const res = await fetch("/api/n8n");
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: {
      webhookUrl: string;
      webhookSecret?: string;
      config: Record<string, unknown>;
    }) => {
      const res = await fetch("/api/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save config");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["n8n-config"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/n8n", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete config");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["n8n-config"] }),
  });

  function handleSave() {
    if (!webhookUrl.trim()) return;
    const folder =
      gdriveFolder.trim() || (config?.config?.gdrive_folder as string) || "Biokool/Documentos";
    saveMutation.mutate({
      webhookUrl: webhookUrl.trim(),
      webhookSecret: webhookSecret.trim() || undefined,
      config: { gdrive_folder: folder },
    });
  }

  function handleDelete() {
    if (confirm("Eliminar configuración de n8n?")) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return <div className="text-text-faint text-sm">Cargando...</div>;
  }

  const isConfigured = config?.webhook_url;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-primary">n8n Integration</h3>
        {isConfigured && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success-low text-success">
            Configurado
          </span>
        )}
      </div>

      <p className="text-xs text-text-faint">
        Conecta con n8n para subir documentos a Google Drive y mantener historial de versiones.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-text-subtle mb-1">
            Carpeta Google Drive <span className="text-ai-green">*</span>
          </label>
          <input
            type="text"
            value={gdriveFolder || config?.config?.gdrive_folder || ""}
            onChange={(e) => setGdriveFolder(e.target.value)}
            placeholder="Biokool/Documentos"
            className="w-full bg-surface-shade border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-text-faint focus:outline-none focus:border-focus"
          />
          <p className="text-[10px] text-text-faint mt-1">
            Los archivos se guardan directamente en esta ruta. Ejemplo:{" "}
            <code className="bg-surface-hover px-1 rounded">Biokool/Catálogos</code>
          </p>
        </div>

        <div>
          <label className="block text-xs text-text-subtle mb-1">Webhook URL</label>
          <input
            type="url"
            value={webhookUrl || config?.webhook_url || ""}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="http://localhost:5678/webhook/upload-document"
            className="w-full bg-surface-shade border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-text-faint focus:outline-none focus:border-focus"
          />
        </div>

        <div>
          <label className="block text-xs text-text-subtle mb-1">Webhook Secret (opcional)</label>
          <input
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="Tu secreto para autenticar requests"
            className="w-full bg-surface-shade border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-text-faint focus:outline-none focus:border-focus"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!(webhookUrl.trim() || config?.webhook_url) || saveMutation.isPending}
            className="bg-ai-green hover:bg-ai-green/85 text-ai-green-contrast text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {saveMutation.isPending ? "Guardando..." : "Guardar"}
          </button>

          {isConfigured && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-error hover:bg-error-low text-xs font-bold px-4 py-2 rounded-lg"
            >
              Desconectar
            </button>
          )}
        </div>

        {saveMutation.isSuccess && <p className="text-xs text-ai-green">Configuración guardada</p>}
        {saveMutation.isError && <p className="text-xs text-error">Error al guardar</p>}
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-[11px] text-text-faint">
          <strong>Flujo:</strong> App → n8n Webhook → Google Drive → URL para ingestión
        </p>
        <p className="text-[11px] text-text-faint mt-1">
          <strong>Workflow:</strong> Importa{" "}
          <code className="bg-surface-hover px-1 rounded">
            docs/n8n/document-upload-workflow.json
          </code>
        </p>
      </div>
    </div>
  );
}
