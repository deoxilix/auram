import { useState } from "react";
import type { PodcastResponse } from "../../types";
import { useVapi } from "../../hooks/useVapi";
import { useEstimatedProgress } from "../../hooks/useEstimatedProgress";
import TranscriptView from "./TranscriptView";
import SegmentProgress from "./SegmentProgress";
import TopicSidebar from "./TopicSidebar";

interface Props {
  podcast: PodcastResponse;
  publicKey: string;
  assistantId: string;
  scriptContext: string;
  onLeave: () => void;
}

/** Live session room backed by VAPI instead of LiveKit. Mirrors SessionRoom. */
export default function VapiSessionRoom({
  podcast,
  publicKey,
  assistantId,
  scriptContext,
  onLeave,
}: Props) {
  const { isConnected, isSpeaking, volume, lines, error, stop, setMuted } =
    useVapi({
      publicKey,
      assistantId,
      // The dashboard assistant's {{topic}} and {{script}} template variables.
      variables: { topic: podcast.title, script: scriptContext },
    });
  const [talking, setTalking] = useState(false);
  // Approximate the script position from elapsed call time.
  const { index: currentIndex, fraction } = useEstimatedProgress(
    podcast.segments,
    isConnected,
  );

  const holdStart = () => {
    setTalking(true);
    setMuted(false);
  };
  const holdStop = () => {
    setTalking(false);
    setMuted(true);
  };

  const handleLeave = () => {
    stop();
    onLeave();
  };

  const status = error
    ? "error"
    : isConnected
      ? isSpeaking
        ? "speaking"
        : "listening"
      : "connecting";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{podcast.title}</h1>
            <p className="text-xs capitalize text-slate-500">{status}</p>
          </div>
          <button
            onClick={handleLeave}
            className="rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Leave
          </button>
        </div>

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}

        {/* Volume-driven visualizer (VAPI emits assistant output level). */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">
            Host · {status}
          </div>
          <div className="flex h-28 items-end gap-1">
            {Array.from({ length: 9 }).map((_, i) => {
              const center = 1 - Math.abs(i - 4) / 4;
              const h = isSpeaking
                ? Math.max(8, volume * 112 * (0.5 + center))
                : 8;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-brand-500 transition-all duration-100"
                  style={{ height: `${h}px` }}
                />
              );
            })}
          </div>
        </div>

        <button
          onPointerDown={holdStart}
          onPointerUp={holdStop}
          onPointerLeave={() => talking && holdStop()}
          disabled={!isConnected}
          className={
            "w-full select-none rounded-xl px-6 py-5 text-lg font-semibold text-white transition disabled:opacity-50 " +
            (talking
              ? "bg-emerald-600 scale-[0.99]"
              : "bg-brand-600 hover:bg-brand-700")
          }
        >
          {talking ? "Listening… release to send" : "Hold to Interrupt / Ask"}
        </button>

        <TranscriptView lines={lines} />
      </div>

      <div className="space-y-4">
        <SegmentProgress
          podcast={podcast}
          currentIndex={currentIndex}
          fraction={fraction}
        />
        <TopicSidebar podcast={podcast} currentIndex={currentIndex} />
      </div>
    </div>
  );
}
