"use client";

import type { KnowledgeBaseWithStats } from "@/core/types/rag";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/use-documents";
import DocumentList from "./DocumentList";
import UploadZone from "./UploadZone";

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
          ? "border-ai-green-light bg-navy-700"
          : "border-navy-500 bg-navy-800 hover:border-navy-400"
      }`}
    >
      <div onClick={onSelect} className="p-4 cursor-pointer flex justify-between items-start">
        <div>
          <h3 className="font-bold text-navy-200">{kb.name}</h3>
          {kb.description && <p className="text-xs text-navy-400 mt-1">{kb.description}</p>}
          <div className="flex gap-3 mt-2 text-[11px] text-navy-300">
            <span>{kb.document_count} docs</span>
            <span>{kb.total_chunks} chunks</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(kb.id);
          }}
          className="text-navy-400 hover:text-red-alert p-1"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      {isSelected && (
        <div className="px-4 pb-4 space-y-3 border-t border-navy-600 pt-3">
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
