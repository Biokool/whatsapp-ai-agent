"use client";

import { useState } from "react";
import {
  useKnowledgeBases,
  useCreateKnowledgeBase,
  useDeleteKnowledgeBase,
} from "@/hooks/use-knowledge-bases";
import KnowledgeBaseCard from "./KnowledgeBaseCard";
import N8nSettings from "./N8nSettings";
import type { KnowledgeBaseWithStats } from "@/core/types/rag";
import { GraduationCap, Settings } from "lucide-react";

export default function KnowledgeSection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: knowledgeBases = [], isLoading } = useKnowledgeBases();
  const createMutation = useCreateKnowledgeBase();
  const deleteMutation = useDeleteKnowledgeBase();

  function handleCreate() {
    if (!newName.trim()) return;
    createMutation.mutate(
      { name: newName.trim(), description: newDesc.trim() || undefined },
      {
        onSuccess: () => {
          setNewName("");
          setNewDesc("");
          setShowCreate(false);
        },
      }
    );
  }

  function handleDelete(id: string) {
    if (confirm("Eliminar esta Knowledge Base y todos sus documentos?")) {
      deleteMutation.mutate(id);
      if (selectedId === id) setSelectedId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-lg font-bold text-primary flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-ai-green" />
          Knowledge Base
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              showSettings
                ? "bg-surface-hover text-primary"
                : "bg-surface-hover text-text-subtle hover:text-primary"
            }`}
          >
            <Settings className="w-4 h-4 inline-block align-middle mr-1" />
            n8n
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-ai-green hover:bg-ai-green/85 text-ai-green-contrast text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-surface rounded-xl p-4 border border-border">
          <N8nSettings />
        </div>
      )}

      {showCreate && (
        <div className="bg-surface rounded-xl p-4 space-y-3 border border-border">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre (ej: Catálogo Biokool)"
            className="w-full bg-surface-shade border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-text-faint focus:outline-none focus:border-focus"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full bg-surface-shade border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-text-faint focus:outline-none focus:border-focus"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-ai-green hover:bg-ai-green/85 text-ai-green-contrast text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {createMutation.isPending ? "Creando..." : "Crear"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-text-faint hover:text-primary text-xs px-3 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-text-faint text-sm">Cargando...</div>
      ) : knowledgeBases.length === 0 ? (
        <div className="text-center py-12 text-text-faint">
          <GraduationCap className="w-10 h-10 mb-2 text-text-faint mx-auto" />
          <p className="text-sm">No hay Knowledge Bases creadas.</p>
          <p className="text-xs text-text-faint mt-1">
            Crea una para subir catálogos, FAQs y documentación técnica.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {knowledgeBases.map((kb: KnowledgeBaseWithStats) => (
            <KnowledgeBaseCard
              key={kb.id}
              kb={kb}
              isSelected={selectedId === kb.id}
              onSelect={() => setSelectedId(selectedId === kb.id ? null : kb.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
