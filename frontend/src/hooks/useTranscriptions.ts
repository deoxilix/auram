import { useEffect, useState } from "react";
import { sessionsApi } from "../api/client";

export interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  final: boolean;
}

/**
 * Polls the DB conversation history to get the transcript with correct
 * speaker labels (host=Alex, guest=Sam). Polls every 3 seconds.
 */
export function useTranscriptions(sessionId?: string): TranscriptLine[] {
  const [lines, setLines] = useState<Map<string, TranscriptLine>>(new Map());
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const turns = await sessionsApi.history(sessionId);
        if (cancelled) return;
        setLines((prev) => {
          const next = new Map(prev);
          for (const t of turns) {
            const id = `db-${t.id}`;
            if (!next.has(id)) {
              next.set(id, {
                id,
                speaker: t.speaker_id,
                text: t.text,
                final: true,
              });
            }
          }
          return next;
        });
        setOrder((prev) => {
          const seen = new Set(prev);
          const added: string[] = [];
          for (const t of turns) {
            const id = `db-${t.id}`;
            if (!seen.has(id)) {
              seen.add(id);
              added.push(id);
            }
          }
          return added.length ? [...prev, ...added] : prev;
        });
      } catch {
        // session not yet active
      }
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [sessionId]);

  return order.map((id) => lines.get(id)).filter(Boolean) as TranscriptLine[];
}
