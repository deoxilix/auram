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

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white"
          onClick={toggle}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="text-sm">
          <div className="font-medium">
            Segment {current + 1} / {playable.length}
          </div>
          <div className="text-slate-500">
            {speakerName(manifest.segments[current]?.speaker_id ?? "")}
          </div>
        </div>
        <audio ref={audioRef} onEnded={onEnded} className="hidden" />
      </div>

      <div className="space-y-2">
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
                "block w-full rounded-lg border p-3 text-left text-sm transition " +
                (isActive
                  ? "border-brand-600 bg-brand-50"
                  : "border-slate-200 bg-white hover:bg-slate-50")
              }
            >
              <span className="mr-2 font-semibold text-brand-700">
                {speakerName(seg.speaker_id)}:
              </span>
              <span className="text-slate-700">{seg.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
