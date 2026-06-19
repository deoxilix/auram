import { Link } from "react-router-dom";
import PodcastCard from "../components/PodcastCard";
import { usePodcasts } from "../hooks/usePodcasts";

export default function LibraryPage() {
  const { data: podcasts, isLoading } = usePodcasts();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Podcast library</h1>
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {podcasts && podcasts.length === 0 && (
        <p className="text-sm text-slate-500">
          No podcasts yet. Generate one from the{" "}
          <Link to="/" className="text-brand-600 underline">
            Upload
          </Link>{" "}
          page.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {podcasts?.map((p) => (
          <PodcastCard key={p.id} podcast={p} />
        ))}
      </div>
    </div>
  );
}
