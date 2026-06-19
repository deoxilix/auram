import { useNavigate } from "react-router-dom";
import type { PodcastResponse } from "../types";
import StatusBadge from "./StatusBadge";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

// Simple color thumbnails based on title hash
function Thumbnail({ title }: { title: string }) {
  const colors = [
    "from-brand-400 to-violet-600",
    "from-emerald-400 to-teal-600",
    "from-amber-400 to-orange-600",
    "from-rose-400 to-pink-600",
    "from-cyan-400 to-blue-600",
    "from-fuchsia-400 to-purple-600",
  ];
  const idx = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <div className={`flex h-36 w-full items-center justify-center rounded-lg bg-gradient-to-br ${colors[idx]}`}>
      <span className="text-3xl font-bold text-white/80">
        {title.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function PodcastCard({ podcast }: { podcast: PodcastResponse }) {
  const navigate = useNavigate();

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition hover:shadow-elevated">
      {/* Thumbnail */}
      <Thumbnail title={podcast.title} />

      {/* Content */}
      <div className="p-4">
        <StatusBadge status={podcast.status} />
        <h3 className="mt-2 text-sm font-semibold leading-snug text-[#0b1c30] line-clamp-2">
          {podcast.title}
        </h3>

        <div className="mt-2 flex items-center gap-2 text-xs text-[#565e74]">
          <span>{podcast.document_id ? "PDF" : "Text"} Source</span>
          {podcast.estimated_duration_sec > 0 && (
            <>
              <span>·</span>
              <span>{formatDuration(podcast.estimated_duration_sec)}</span>
            </>
          )}
          <span>·</span>
          <span>{formatDate(podcast.created_at)}</span>
        </div>

        {/* Action area */}
        <div className="mt-4">
          {podcast.status === "ready" && (
            <button
              onClick={() => navigate(`/podcasts/${podcast.id}`)}
              className="w-full rounded-lg bg-brand-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 active:scale-[0.98]"
            >
              Play Live
            </button>
          )}
          {podcast.status === "generating" && (
            <div className="space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-3/4 rounded-full bg-brand-400" />
              </div>
              <p className="text-xs text-[#565e74]">75% Complete</p>
            </div>
          )}
          {podcast.status === "failed" && (
            <button
              onClick={() => navigate(`/podcasts/${podcast.id}`)}
              className="w-full rounded-lg border border-brand-400 px-4 py-2 text-sm font-semibold text-brand-500 transition hover:bg-brand-50 active:scale-[0.98]"
            >
              Retry Generation
            </button>
          )}
          {podcast.status === "pending" && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-1/4 animate-pulse rounded-full bg-brand-300" />
            </div>
          )}
        </div>

        {podcast.error && (
          <p className="mt-2 text-xs text-rose-600">{podcast.error}</p>
        )}
      </div>
    </div>
  );
}
