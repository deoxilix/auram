import { useEffect, useMemo, useRef, useState } from "react";
import type { AudioManifest, PodcastResponse } from "../types";

interface Props {
  podcast: PodcastResponse;
  manifest: AudioManifest;
}

/** Plays podcast segments back-to-back, highlighting the active line. */
export default function AudioPlayer({ podcast, manifest }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const playable = useMemo(
    () => manifest.segments.filter((s) => s.ready && s.audio_url),
    [manifest],
  );
  const speakerName = (id: string) =>
    podcast.speakers.find((s) => s.id === id)?.name ?? id;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || playable.length === 0) return;
    audio.src = playable[current].audio_url!;
    if (playing) void audio.play();
  }, [current, playable, playing]);

  const onEnded = () => {
    if (current < playable.length - 1) setCurrent((c) => c + 1);
    else setPlaying(false);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  };

  if (playable.length === 0) {
    return <p className="text-sm text-slate-500">No audio available yet.</p>;
  }

  const progress = playable.length > 0 ? (current + 1) / playable.length : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card">
      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-t-xl bg-slate-100">
        <div
          className="h-full bg-brand-400 transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 p-5">
        <button
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-400 text-white shadow-sm transition hover:bg-brand-500 active:scale-95"
          onClick={toggle}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#0b1c30]">
            {speakerName(manifest.segments[current]?.speaker_id ?? "")}
          </p>
          <p className="truncate text-xs text-[#565e74]">
            Segment {current + 1} of {playable.length}
          </p>
        </div>
        <div className="text-sm font-medium text-[#565e74]">
          {Math.round(progress * 100)}%
        </div>
        <audio ref={audioRef} onEnded={onEnded} className="hidden" />
      </div>

      {/* Segment transcript list */}
      <div className="max-h-80 space-y-1 overflow-y-auto border-t border-slate-100 p-4">
        {podcast.segments.map((seg) => {
          const isActive = playable[current]?.segment_id === seg.id;
          return (
            <button
              key={seg.id}
              onClick={() => {
                const idx = playable.findIndex((p) => p.segment_id === seg.id);
                if (idx >= 0) {
                  setCurrent(idx);
                  setPlaying(true);
                }
              }}
              className={
                "block w-full rounded-lg px-3 py-2.5 text-left text-sm transition " +
                (isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50")
              }
            >
              <span className={`mr-2 font-semibold ${isActive ? "text-brand-500" : "text-slate-500"}`}>
                {speakerName(seg.speaker_id)}:
              </span>
              <span className={isActive ? "" : "text-slate-600"}>{seg.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
