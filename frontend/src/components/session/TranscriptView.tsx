import { useEffect, useRef } from "react";
import type { TranscriptLine } from "../../hooks/useTranscriptions";

/** Presentational transcript list, shared by the LiveKit and VAPI session rooms. */
export default function TranscriptView({ lines }: { lines: TranscriptLine[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="flex h-96 flex-col rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold">
        Transcript
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
        {lines.length === 0 && (
          <p className="text-slate-400">Waiting for the conversation to start…</p>
        )}
        {lines.map((line) => (
          <div key={line.id}>
            <span
              className={
                "mr-2 font-semibold " +
                (line.speaker === "user" ? "text-emerald-600" : "text-brand-700")
              }
            >
              {line.speaker === "user" ? "You" : "Host"}:
            </span>
            <span className={line.final ? "text-slate-700" : "text-slate-400"}>
              {line.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
