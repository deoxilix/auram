import { BarVisualizer, useVoiceAssistant } from "@livekit/components-react";

/** Animated bar visualizer driven by the host agent's audio track. */
export default function AudioVisualizer() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">
        Host · {state}
      </div>
      <div className="h-28">
        <BarVisualizer
          state={state}
          trackRef={audioTrack}
          barCount={9}
          options={{ minHeight: 8 }}
        />
      </div>
    </div>
  );
}
