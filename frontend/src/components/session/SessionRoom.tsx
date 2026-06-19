import { RoomAudioRenderer, useConnectionState } from "@livekit/components-react";
import type { PodcastResponse } from "../../types";
import AudioVisualizer from "./AudioVisualizer";
import TranscriptPanel from "./TranscriptPanel";
import InterruptionButton from "./InterruptionButton";

interface Props {
  podcast: PodcastResponse;
  currentIndex: number;
  onLeave: () => void;
  sessionId?: string;
}

export default function SessionRoom({ podcast, currentIndex, onLeave, sessionId }: Props) {
  const connection = useConnectionState();

  const total = podcast.segments.length;
  const currentSeg = podcast.segments[currentIndex];

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      {/* Plays the host/guest audio tracks. */}
      <RoomAudioRenderer />

      {/* Top header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-[#0b1c30]">{podcast.title}</h1>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs capitalize text-[#565e74]">{connection}</span>
          <button
            onClick={onLeave}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          >
            Leave
          </button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 gap-5 overflow-hidden">
        {/* Left: Session Outline */}
        <div className="w-64 shrink-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#565e74]">
            Session Outline
          </h3>
          <div className="space-y-1">
            {podcast.segments.map((seg, i) => {
              const isActive = i === currentIndex;
              const isDone = i < currentIndex;
              return (
                <div
                  key={seg.id}
                  className={
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition " +
                    (isActive
                      ? "bg-brand-50 text-brand-500"
                      : isDone
                        ? "text-slate-400"
                        : "text-[#565e74]")
                  }
                >
                  <div
                    className={
                      "h-2 w-2 shrink-0 rounded-full " +
                      (isActive
                        ? "bg-brand-400"
                        : isDone
                          ? "bg-slate-300"
                          : "bg-slate-200")
                    }
                  />
                  <span className={isDone ? "line-through" : ""}>
                    {seg.segment_type === "intro"
                      ? "Intro"
                      : seg.segment_type === "outro"
                        ? "Outro"
                        : seg.segment_type === "qa"
                          ? "Q&A"
                          : `Topic ${seg.topic_tags[0] || (i > 0 ? String.fromCharCode(64 + i) : "") || i + 1}`}
                  </span>
                  {isActive && <span className="ml-auto text-xs text-brand-400">●</span>}
                </div>
              );
            })}
          </div>

          {/* Deferred questions */}
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#565e74]">
              Your Questions
            </h3>
            <p className="text-xs italic text-slate-400">
              Questions will appear here when deferred.
            </p>
          </div>
        </div>

        {/* Center: Visualizer + Timer + Speak */}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          {/* Speaker indicators */}
          <div className="flex items-center justify-center gap-6 text-xs font-medium text-[#565e74]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-400" />
              HOST
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              GUEST
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              YOU
            </div>
          </div>

          {/* Visualizer */}
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6 shadow-card">
            <AudioVisualizer />
          </div>

          {/* Timer */}
          <div className="text-center text-sm font-medium text-[#565e74]">
            {currentSeg && (
              <span>
                Segment {currentIndex + 1} of {total}
              </span>
            )}
          </div>

          {/* Hold to Speak + Type */}
          <div className="space-y-2">
            <InterruptionButton />
          </div>
        </div>

        {/* Right: Live Transcript */}
        <div className="w-80 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#565e74]">
            Live Transcript
          </div>
          <div className="h-full overflow-y-auto">
            <TranscriptPanel speakers={podcast.speakers} sessionId={sessionId} />
          </div>
        </div>
      </div>
    </div>
  );
}
