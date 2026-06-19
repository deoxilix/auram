import { useEffect, useRef } from "react";
import { useTranscriptions } from "../../hooks/useTranscriptions";
import type { SpeakerProfile } from "../../types";

interface Props {
  speakers: SpeakerProfile[];
  sessionId?: string;
}

export default function TranscriptPanel({ speakers, sessionId }: Props) {
  const lines = useTranscriptions(sessionId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  // Build a lookup: speaker_id -> name
  const lookup = new Map<string, string>();
  for (const s of speakers) {
    lookup.set(s.id, s.name);
  }

  const speakerLabel = (id: string): string => {
    return lookup.get(id) ?? (id === "user" ? "YOU" : id.toUpperCase());
  };

  const speakerColor = (id: string): string => {
    if (id === "user") return "text-amber-600";
    if (id === "guest") return "text-emerald-600";
    return "text-brand-500";
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex-1 space-y-3 overflow-y-auto text-sm">
        {lines.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            Waiting for the conversation to start…
          </p>
        )}
        {lines.map((line) => {
          const name = speakerLabel(line.speaker);
          const color = speakerColor(line.speaker);
          return (
            <div key={line.id}>
              <span className={`mr-2 text-xs font-bold uppercase ${color}`}>
                {name}
              </span>
              <span className={line.final ? "text-slate-700" : "text-slate-400 italic"}>
                {line.text}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
