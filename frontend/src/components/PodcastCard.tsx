import { useNavigate } from "react-router-dom";
import type { PodcastResponse } from "../types";
import StatusBadge from "./StatusBadge";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function PodcastCard({ podcast }: { podcast: PodcastResponse }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{podcast.title}</h3>
        <StatusBadge status={podcast.status} />
      </div>
      {podcast.overview && (
        <p className="mb-3 line-clamp-3 text-sm text-slate-600">{podcast.overview}</p>
      )}
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <span>{podcast.speakers.filter((s) => !s.is_user).length} hosts</span>
        {podcast.estimated_duration_sec > 0 && (
          <>
            <span>·</span>
            <span>~{formatDuration(podcast.estimated_duration_sec)}</span>
          </>
        )}
      </div>
      <button
        className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        disabled={podcast.status !== "ready"}
        onClick={() => navigate(`/podcasts/${podcast.id}`)}
      >
        Open
      </button>
      {podcast.error && (
        <p className="mt-2 text-xs text-rose-600">{podcast.error}</p>
      )}
    </div>
  );
}
