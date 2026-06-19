import { RoomAudioRenderer, useConnectionState } from "@livekit/components-react";
import type { PodcastResponse } from "../../types";
import AudioVisualizer from "./AudioVisualizer";
import TranscriptPanel from "./TranscriptPanel";
import SegmentProgress from "./SegmentProgress";
import TopicSidebar from "./TopicSidebar";
import InterruptionButton from "./InterruptionButton";

interface Props {
  podcast: PodcastResponse;
  currentIndex: number;
  onLeave: () => void;
}

export default function SessionRoom({ podcast, currentIndex, onLeave }: Props) {
  const connection = useConnectionState();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Plays the host/guest audio tracks. */}
      <RoomAudioRenderer />

      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{podcast.title}</h1>
            <p className="text-xs capitalize text-slate-500">{connection}</p>
          </div>
          <button
            onClick={onLeave}
            className="rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Leave
          </button>
        </div>

        <AudioVisualizer />
        <InterruptionButton />
        <TranscriptPanel />
      </div>

      <div className="space-y-4">
        <SegmentProgress podcast={podcast} currentIndex={currentIndex} />
        <TopicSidebar podcast={podcast} currentIndex={currentIndex} />
      </div>
    </div>
  );
}
