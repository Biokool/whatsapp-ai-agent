import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useDocuments(kbId: string | null) {
  return useQuery({
    queryKey: ["documents", kbId],
    queryFn: async () => {
      if (!kbId) return [];
      const res = await fetch(`/api/knowledge-bases/${kbId}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    enabled: !!kbId,
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (!docs || !Array.isArray(docs)) return false;
      const hasInProgress = docs.some(
        (d: { status: string }) => d.status === "pending" || d.status === "processing"
      );
      return hasInProgress ? 5000 : false;
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kbId, file, url }: { kbId: string; file?: File; url?: string }) => {
      // First create document record
      const source_type = url ? "url" : "pdf";
      const createRes = await fetch(`/api/knowledge-bases/${kbId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: url || file?.name || "Document",
          source_type,
          source_url: url,
        }),
      });
      if (!createRes.ok) throw new Error("Failed to create document");
      const doc = await createRes.json();

      // For URLs, trigger processing immediately
      if (url) {
        const uploadRes = await fetch(`/api/documents/${doc.id}/upload`, {
          method: "POST",
        });
        if (!uploadRes.ok) throw new Error("Failed to process URL");
        return doc;
      }

      // For files, upload the file
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch(`/api/documents/${doc.id}/upload`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload file");
        return doc;
      }

      return doc;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}
