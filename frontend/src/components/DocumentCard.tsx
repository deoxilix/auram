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
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex min-w-0 items-center gap-4">
        {/* Thumbnail */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface">
          <span className="text-lg text-brand-400">📄</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#0b1c30]">{doc.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-[#565e74]">
            <span>{doc.type.toUpperCase()}</span>
            <span>·</span>
            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
          </div>
          {doc.error && <p className="mt-1 text-xs text-rose-600">{doc.error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge status={doc.status} />
        <button
          className="rounded-lg bg-brand-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 active:scale-[0.98] disabled:opacity-40"
          disabled={doc.status !== "ready" || generate.isPending}
          onClick={onGenerate}
        >
          {generate.isPending ? "Generating…" : "Generate Podcast"}
        </button>
      </div>
    </div>
  );
}
