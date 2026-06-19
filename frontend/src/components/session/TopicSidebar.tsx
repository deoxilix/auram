import type { PodcastResponse } from "../../types";

interface Props {
  podcast: PodcastResponse;
  currentIndex: number;
}

export default function TopicSidebar({ podcast, currentIndex }: Props) {
  // Show distinct upcoming topic/qa segments as a lightweight outline.
  const upcoming = podcast.segments
    .filter((s) => s.sequence > currentIndex)
    .filter((s) => s.segment_type === "topic" || s.segment_type === "qa")
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold">Coming up</div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-slate-400">Wrapping up soon.</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-600">
          {upcoming.map((s) => (
            <li key={s.id} className="flex gap-2">
              <span className="text-slate-300">•</span>
              <span className="line-clamp-2">{s.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
