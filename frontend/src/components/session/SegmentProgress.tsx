import type { PodcastResponse } from "../../types";

interface Props {
  podcast: PodcastResponse;
  currentIndex: number;
}

export default function SegmentProgress({ podcast, currentIndex }: Props) {
  const total = podcast.segments.length;
  const pct = total ? Math.min((currentIndex / total) * 100, 100) : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">Progress</span>
        <span className="text-slate-500">
          {Math.min(currentIndex + 1, total)} / {total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-brand-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
