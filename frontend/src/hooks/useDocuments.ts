import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/client";
import type { DocumentType } from "../types";

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: documentsApi.list,
    // Poll while any document is still processing.
    refetchInterval: (query) => {
      const docs = query.state.data;
      const pending = docs?.some(
        (d) => d.status === "pending" || d.status === "processing",
      );
      return pending ? 2000 : false;
    },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { type: DocumentType; source: string; title?: string }) =>
      documentsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) =>
      documentsApi.upload(file, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}
