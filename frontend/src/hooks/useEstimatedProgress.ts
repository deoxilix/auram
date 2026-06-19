import { useEffect, useMemo, useRef, useState } from "react";
import type { SegmentResponse } from "../types";

export interface EstimatedProgress {
  /** Derived segment index based on elapsed time vs segment durations. */
  index: number;
  /** Seconds elapsed since the call became active. */
  elapsed: number;
  /** 0..1 fraction of the estimated total duration. */
  fraction: number;
}

/**
 * Approximates podcast position from elapsed call time. VAPI runs the whole
 * conversation server-side, so we can't track the real script cursor — instead
 * we walk the cumulative segment durations to estimate which segment is playing.
 */
export function useEstimatedProgress(
  segments: SegmentResponse[],
  active: boolean,
): EstimatedProgress {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    startRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - (startRef.current ?? Date.now())) / 1000);
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  return useMemo(() => {
    const total = segments.reduce(
      (sum, s) => sum + (s.estimated_duration_sec || 0),
      0,
    );
    // Find the segment whose cumulative window contains `elapsed`.
    let acc = 0;
    let index = 0;
    for (let i = 0; i < segments.length; i++) {
      acc += segments[i].estimated_duration_sec || 0;
      if (elapsed < acc) {
        index = i;
        break;
      }
      index = i + 1; // past the end of this segment
    }
    index = Math.min(index, Math.max(segments.length - 1, 0));
    const fraction = total ? Math.min(elapsed / total, 1) : 0;
    return { index, elapsed, fraction };
  }, [segments, elapsed]);
}
