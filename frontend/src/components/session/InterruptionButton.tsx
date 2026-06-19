import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";

/**
 * Push-to-talk: mic enables on press, disables on release.
 * Requests mic permission once on mount then keeps the track disabled.
 */
export default function InterruptionButton() {
  const room = useRoomContext();
  const [talking, setTalking] = useState(false);
  const readyRef = useRef(false);

  // Request mic permission once, keep disabled.
  useEffect(() => {
    const p = room?.localParticipant;
    if (!p || readyRef.current) return;
    readyRef.current = true;
    p.enableCameraAndMicrophone().catch(() => {});
    // Mute the mic immediately after permission is granted.
    setTimeout(() => p.setMicrophoneEnabled(false).catch(() => {}), 100);
  }, [room]);

  const start = useCallback(async () => {
    const p = room?.localParticipant;
    if (!p) return;
    setTalking(true);
    try {
      await p.setMicrophoneEnabled(true);
    } catch {
      setTalking(false);
    }
  }, [room]);

  const stop = useCallback(async () => {
    const p = room?.localParticipant;
    if (!p) return;
    setTalking(false);
    try {
      await p.setMicrophoneEnabled(false);
    } catch {
      // ignore
    }
  }, [room]);

  return (
    <button
      onMouseDown={start}
      onMouseUp={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      disabled={!room?.localParticipant}
      className={
        "w-full select-none rounded-xl px-6 py-4 text-base font-semibold text-white transition-all " +
        (talking
          ? "bg-emerald-500 shadow-sm"
          : "bg-brand-400 shadow-sm hover:bg-brand-500 active:scale-[0.98] disabled:opacity-40")
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
