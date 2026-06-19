import { useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";

/**
 * Push-to-talk: the mic stays muted until held. While held, the user's audio is
 * published and the realtime host detects the interruption and responds.
 */
export default function InterruptionButton() {
  const { localParticipant } = useLocalParticipant();
  const [talking, setTalking] = useState(false);

  const start = async () => {
    setTalking(true);
    await localParticipant.setMicrophoneEnabled(true);
  };
  const stop = async () => {
    setTalking(false);
    await localParticipant.setMicrophoneEnabled(false);
  };

  return (
    <button
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={() => talking && stop()}
      className={
        "w-full select-none rounded-xl px-6 py-4 text-base font-semibold text-white transition-all " +
        (talking
          ? "scale-[0.99] bg-emerald-500 shadow-sm"
          : "bg-brand-400 shadow-sm hover:bg-brand-500 active:scale-[0.98]")
      }
    >
      {talking ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Listening… release to send
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <span>🎙</span>
          Hold to Speak
        </span>
      )}
    </button>
  );
}
