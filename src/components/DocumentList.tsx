"use client";

import type { Document } from "@/core/types/rag";
import { FileText, Trash2 } from "lucide-react";

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
}

function StatusBadge({ status }: { status: Document["status"] }) {
  const styles = {
    ready: "bg-success-low text-success",
    processing: "bg-warning-low text-warning",
    pending: "bg-surface-hover text-text-subtle",
    error: "bg-error-low text-error",
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
      <p className="text-sm text-text-faint text-center py-4">
        No hay documentos. Sube un PDF para empezar.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between p-2 bg-surface rounded-lg">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="w-4 h-4 shrink-0 text-text-faint" />
            <span className="text-sm text-primary truncate">{doc.title}</span>
            <StatusBadge status={doc.status} />
            {doc.status === "ready" && (
              <span className="text-[10px] text-text-faint">{doc.chunk_count} chunks</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {doc.status === "error" && doc.error_message && (
              <span
                className="text-[10px] text-error max-w-[150px] truncate"
                title={doc.error_message}
              >
                {doc.error_message}
              </span>
            )}
            <button
              onClick={() => onDelete(doc.id)}
              className="text-text-faint hover:text-error p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
