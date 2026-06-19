import { useEffect, useState } from "react";
import { RoomEvent, type TranscriptionSegment, type Participant } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";

export interface TranscriptLine {
  id: string;
  speaker: "user" | "host";
  text: string;
  final: boolean;
}

/** Collects real-time transcription segments from the room, ordered by arrival. */
export function useTranscriptions(): TranscriptLine[] {
  const room = useRoomContext();
  const [lines, setLines] = useState<Record<string, TranscriptLine>>({});
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    if (!room) return;
    const onTranscription = (
      segments: TranscriptionSegment[],
      participant?: Participant,
    ) => {
      const speaker: "user" | "host" =
        participant && !participant.isLocal ? "host" : "user";
      setLines((prev) => {
        const next = { ...prev };
        for (const s of segments) {
          next[s.id] = { id: s.id, speaker, text: s.text, final: s.final };
        }
        return next;
      });
      setOrder((prev) => {
        const seen = new Set(prev);
        const added = segments.map((s) => s.id).filter((id) => !seen.has(id));
        return added.length ? [...prev, ...added] : prev;
      });
    };

    room.on(RoomEvent.TranscriptionReceived, onTranscription);
    return () => {
      room.off(RoomEvent.TranscriptionReceived, onTranscription);
    };
  }, [room]);

  return order.map((id) => lines[id]).filter(Boolean);
}
