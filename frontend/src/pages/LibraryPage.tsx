import { Link } from "react-router-dom";
import PodcastCard from "../components/PodcastCard";
import { usePodcasts } from "../hooks/usePodcasts";

export default function LibraryPage() {
  const { data: podcasts, isLoading } = usePodcasts();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Your Library</h1>
          <p className="mt-1 text-sm text-[#565e74]">
            Manage and playback your AI-generated audio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#565e74] outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-50">
            <option>All Statuses</option>
            <option>Ready</option>
            <option>Generating</option>
            <option>Failed</option>
          </select>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#565e74] outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-50">
            <option>Sort: Recent</option>
            <option>Sort: Oldest</option>
            <option>Sort: A-Z</option>
          </select>
        </div>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {podcasts && podcasts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50">
            <span className="text-2xl text-brand-400">🎙</span>
          </div>
          <p className="mt-4 text-sm font-medium text-[#0b1c30]">No podcasts yet</p>
          <p className="mt-1 text-sm text-[#565e74]">
            Generate one from the{" "}
            <Link to="/" className="text-brand-500 underline">
              Upload
            </Link>{" "}
            page.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {podcasts?.map((p) => (
          <PodcastCard key={p.id} podcast={p} />
        ))}
      </div>
    </div>
  );
}
