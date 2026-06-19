import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { sessionsApi } from "../api/client";
import { useCreateSession, useLeaveSession } from "../hooks/useSession";
import { usePodcast } from "../hooks/usePodcasts";
import SessionRoom from "../components/session/SessionRoom";
import type { SessionResponse } from "../types";

export default function SessionPage() {
  const { id: podcastId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: podcast } = usePodcast(podcastId);
  const createSession = useCreateSession();
  const leaveSession = useLeaveSession();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const started = useRef(false);

  // Create the session once on mount.
  useEffect(() => {
    if (started.current || !podcastId) return;
    started.current = true;
    createSession.mutate(podcastId, { onSuccess: setSession });
  }, [podcastId, createSession]);

  // Poll session state for the current segment index.
  const { data: liveState } = useQuery({
    queryKey: ["session", session?.id],
    queryFn: () => sessionsApi.get(session!.id),
    enabled: !!session,
    refetchInterval: 3000,
  });

  const onLeave = async () => {
    if (session) await leaveSession.mutateAsync(session.id);
    navigate("/library");
  };

  if (createSession.isError) {
    return (
      <div className="text-sm text-rose-600">
        Could not start the session. Is LiveKit running?{" "}
        <Link to="/library" className="underline">
          Back
        </Link>
      </div>
    );
  }

  if (!session || !session.token || !session.ws_url || !podcast) {
    return <p className="text-sm text-slate-500">Starting live session…</p>;
  }

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.ws_url}
      connect
      audio={false}
      video={false}
      onDisconnected={() => navigate("/library")}
    >
      <SessionRoom
        podcast={podcast}
        currentIndex={liveState?.current_segment_index ?? 0}
        onLeave={onLeave}
      />
    </LiveKitRoom>
  );
}
