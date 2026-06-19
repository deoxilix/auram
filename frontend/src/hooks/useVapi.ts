import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import type { TranscriptLine } from "./useTranscriptions";

export interface UseVapiOptions {
  publicKey: string;
  assistantId: string;
  /**
   * Runtime template variables for the dashboard assistant. The "Aarum Host"
   * assistant expects `{{topic}}` and `{{script}}`; these bind via
   * `assistantOverrides.variableValues` when the call starts.
   */
  variables: Record<string, string>;
}

export interface VapiState {
  isConnected: boolean;
  isSpeaking: boolean; // the assistant is speaking
  /** Assistant output volume 0..1, for the visualizer. */
  volume: number;
  lines: TranscriptLine[];
  error: string | null;
  stop: () => void;
  /** Push-to-talk: mute/unmute the local mic mid-call. */
  setMuted: (muted: boolean) => void;
}

/**
 * Wraps the VAPI Web SDK: auto-starts a call against the dashboard assistant,
 * injecting the podcast as `{{topic}}`/`{{script}}` variables, and surfaces
 * connection / speaking / transcript state in the same shape the LiveKit path uses.
 *
 * The call is started and torn down inside one effect so there is exactly one
 * call per VAPI instance. A `disposed` guard stops any call that finishes
 * connecting *after* cleanup — without it, React StrictMode's dev double-mount
 * leaves an orphaned call whose audio keeps playing with no handle to stop it.
 */
export function useVapi({
  publicKey,
  assistantId,
  variables,
}: UseVapiOptions): VapiState {
  const vapiRef = useRef<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  // Track the index of the in-progress (partial) line per speaker so we can
  // replace it in place until the final transcript arrives.
  const partialIdx = useRef<Record<"user" | "host", number | null>>({
    user: null,
    host: null,
  });
  // Latest variables, read at start() time without re-running the effect.
  const varsRef = useRef(variables);
  varsRef.current = variables;

  useEffect(() => {
    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;
    let disposed = false;

    vapi.on("call-start", () => {
      if (disposed) {
        vapi.stop(); // connected after cleanup (StrictMode race) — kill it.
        return;
      }
      setIsConnected(true);
      vapi.setMuted(true); // push-to-talk: start muted.
    });
    vapi.on("call-end", () => {
      if (disposed) return;
      setIsConnected(false);
      setIsSpeaking(false);
      setVolume(0);
    });
    vapi.on("speech-start", () => !disposed && setIsSpeaking(true));
    vapi.on("speech-end", () => !disposed && setIsSpeaking(false));
    vapi.on("volume-level", (v: number) => !disposed && setVolume(v));
    vapi.on("error", (e: unknown) => {
      if (disposed) return;
      const msg =
        e instanceof Error ? e.message : (e as { message?: string })?.message;
      setError(msg ?? "VAPI call error");
    });

    vapi.on("message", (msg: VapiMessage) => {
      if (disposed || msg.type !== "transcript" || !msg.transcript) return;
      const text = msg.transcript;
      const speaker: "user" | "host" = msg.role === "user" ? "user" : "host";
      const final = msg.transcriptType === "final";
      setLines((prev) => {
        const next = [...prev];
        const idx = partialIdx.current[speaker];
        if (idx !== null && next[idx]) {
          // Update the open partial line for this speaker.
          next[idx] = { ...next[idx], text, final };
        } else {
          next.push({ id: `${speaker}-${next.length}`, speaker, text, final });
          partialIdx.current[speaker] = next.length - 1;
        }
        if (final) partialIdx.current[speaker] = null;
        return next;
      });
    });

    // Auto-start exactly once per instance. The web SDK's 2nd arg IS the
    // assistantOverrides object (not wrapped in { assistantOverrides: ... }).
    vapi.start(assistantId, { variableValues: varsRef.current }).catch((e) => {
      if (!disposed) {
        setError(e instanceof Error ? e.message : "Failed to start VAPI call");
      }
    });

    return () => {
      disposed = true;
      vapi.stop();
      vapiRef.current = null;
    };
  }, [publicKey, assistantId]);

  const stop = useCallback(() => vapiRef.current?.stop(), []);

  const setMuted = useCallback((muted: boolean) => {
    vapiRef.current?.setMuted(muted);
  }, []);

  return { isConnected, isSpeaking, volume, lines, error, stop, setMuted };
}

interface VapiMessage {
  type: string;
  role?: "user" | "assistant" | "system";
  transcript?: string;
  transcriptType?: "partial" | "final";
}
