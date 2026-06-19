import { useEffect, useRef } from "react";
import { useTranscriptions } from "../../hooks/useTranscriptions";

export default function TranscriptPanel() {
  const lines = useTranscriptions();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex-1 space-y-3 overflow-y-auto text-sm">
        {lines.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            Waiting for the conversation to start…
          </p>
        )}
        {lines.map((line) => {
          const isUser = line.speaker === "user";
          const color = isUser ? "text-amber-600" : "text-brand-500";
          const label = isUser ? "YOU" : "HOST";
          return (
            <div key={line.id}>
              <span className={`mr-2 text-xs font-bold uppercase ${color}`}>
                {label}
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
