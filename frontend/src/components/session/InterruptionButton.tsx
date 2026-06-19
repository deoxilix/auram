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
        "w-full select-none rounded-xl px-6 py-5 text-lg font-semibold text-white transition " +
        (talking ? "bg-emerald-600 scale-[0.99]" : "bg-brand-600 hover:bg-brand-700")
      }
    >
      {talking ? "Listening… release to send" : "Hold to Interrupt / Ask"}
    </button>
  );
}
