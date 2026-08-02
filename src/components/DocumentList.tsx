"use client";

import type { Document } from "@/core/types/rag";

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
}

function StatusBadge({ status }: { status: Document["status"] }) {
  const styles = {
    ready: "bg-ai-green/20 text-ai-green-light",
    processing: "bg-amber-warm/20 text-amber-warm",
    pending: "bg-navy-600 text-navy-300",
    error: "bg-red-dark/20 text-red-alert",
  };
  const labels = {
    ready: "Listo",
    processing: "Procesando...",
    pending: "Pendiente",
    error: "Error",
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-navy-400 text-center py-4">
        No hay documentos. Sube un PDF para empezar.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between p-2 bg-navy-700 rounded-lg">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="material-symbols-outlined text-navy-400 text-[18px]">description</span>
            <span className="text-sm text-navy-200 truncate">{doc.title}</span>
            <StatusBadge status={doc.status} />
            {doc.status === "ready" && (
              <span className="text-[10px] text-navy-400">{doc.chunk_count} chunks</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {doc.status === "error" && doc.error_message && (
              <span
                className="text-[10px] text-red-alert max-w-[150px] truncate"
                title={doc.error_message}
              >
                {doc.error_message}
              </span>
            )}
            <button
              onClick={() => onDelete(doc.id)}
              className="text-navy-400 hover:text-red-alert p-1"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
