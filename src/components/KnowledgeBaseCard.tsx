"use client";

import type { KnowledgeBaseWithStats } from "@/core/types/rag";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/use-documents";
import DocumentList from "./DocumentList";
import UploadZone from "./UploadZone";
import { Trash2 } from "lucide-react";

interface KnowledgeBaseCardProps {
  kb: KnowledgeBaseWithStats;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
}

export default function KnowledgeBaseCard({
  kb,
  isSelected,
  onSelect,
  onDelete,
}: KnowledgeBaseCardProps) {
  const { data: documents = [] } = useDocuments(isSelected ? kb.id : null);
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  function handleUpload(file: File) {
    uploadMutation.mutate({ kbId: kb.id, file });
  }

  function handleAddUrl(url: string) {
    uploadMutation.mutate({ kbId: kb.id, url });
  }

  function handleDeleteDoc(docId: string) {
    if (confirm("Eliminar este documento?")) {
      deleteMutation.mutate(docId);
    }
  }

  return (
    <div
      className={`rounded-xl border transition-all ${
        isSelected
          ? "border-ai-green bg-surface"
          : "border-border bg-surface hover:border-text-subtle"
      }`}
    >
      <div onClick={onSelect} className="p-4 cursor-pointer flex justify-between items-start">
        <div>
          <h3 className="font-bold text-primary">{kb.name}</h3>
          {kb.description && <p className="text-xs text-text-faint mt-1">{kb.description}</p>}
          <div className="flex gap-3 mt-2 text-[11px] text-text-subtle">
            <span>{kb.document_count} docs</span>
            <span>{kb.total_chunks} chunks</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(kb.id);
          }}
          className="text-text-faint hover:text-error p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isSelected && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <DocumentList documents={documents} onDelete={handleDeleteDoc} />
          <UploadZone
            onUpload={handleUpload}
            onAddUrl={handleAddUrl}
            isUploading={uploadMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}
