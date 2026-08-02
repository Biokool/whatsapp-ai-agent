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
        <h2 className="font-geist text-lg font-bold text-navy-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-ai-green-light">school</span>
          Knowledge Base
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              showSettings
                ? "bg-navy-600 text-navy-200"
                : "bg-navy-700 text-navy-400 hover:text-navy-200"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] align-middle mr-1">
              settings
            </span>
            n8n
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-ai-green hover:bg-ai-green-light text-ai-green-dark text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-navy-700 rounded-xl p-4 border border-navy-500">
          <N8nSettings />
        </div>
      )}

      {showCreate && (
        <div className="bg-navy-700 rounded-xl p-4 space-y-3 border border-navy-500">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre (ej: Catálogo Biokool)"
            className="w-full bg-navy-900 border border-navy-500 rounded-lg px-3 py-2 text-sm text-navy-200 placeholder-navy-400 focus:outline-none focus:border-ai-green-light"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full bg-navy-900 border border-navy-500 rounded-lg px-3 py-2 text-sm text-navy-200 placeholder-navy-400 focus:outline-none focus:border-ai-green-light"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-ai-green hover:bg-ai-green-light text-ai-green-dark text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {createMutation.isPending ? "Creando..." : "Crear"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-navy-400 hover:text-navy-200 text-xs px-3 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-navy-400 text-sm">Cargando...</div>
      ) : knowledgeBases.length === 0 ? (
        <div className="text-center py-12 text-navy-400">
          <span className="material-symbols-outlined text-4xl mb-2 text-navy-500">school</span>
          <p className="text-sm">No hay Knowledge Bases creadas.</p>
          <p className="text-xs text-navy-500 mt-1">
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
