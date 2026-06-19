import { useNavigate } from "react-router-dom";
import { useGeneratePodcast } from "../hooks/usePodcasts";
import type { DocumentResponse } from "../types";
import StatusBadge from "./StatusBadge";

export default function DocumentCard({ doc }: { doc: DocumentResponse }) {
  const navigate = useNavigate();
  const generate = useGeneratePodcast();

  const onGenerate = () =>
    generate.mutate(
      {
        documentId: doc.id,
        params: { target_minutes: 10, tone: "conversational" },
      },
      { onSuccess: () => navigate("/library") },
    );

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{doc.title}</p>
        <p className="text-xs text-slate-500">
          {doc.type.toUpperCase()} ·{" "}
          {new Date(doc.created_at).toLocaleDateString()}
        </p>
        {doc.error && <p className="mt-1 text-xs text-rose-600">{doc.error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge status={doc.status} />
        <button
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          disabled={doc.status !== "ready" || generate.isPending}
          onClick={onGenerate}
        >
          {generate.isPending ? "Generating…" : "Generate Podcast"}
        </button>
      </div>
    </div>
  );
}
