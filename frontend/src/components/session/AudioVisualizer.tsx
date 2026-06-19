import { BarVisualizer, useVoiceAssistant } from "@livekit/components-react";

/** Animated bar visualizer driven by the host agent's audio track. */
export default function AudioVisualizer() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#565e74]">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        {state === "speaking" ? "Speaking…" : state === "listening" ? "Listening…" : "Waiting…"}
      </div>
      <div className="flex h-32 w-full items-center justify-center">
        <BarVisualizer
          state={state}
          trackRef={audioTrack}
          barCount={12}
          options={{ minHeight: 8, maxHeight: 100 }}
        />
      </div>
    </div>
  );
}
