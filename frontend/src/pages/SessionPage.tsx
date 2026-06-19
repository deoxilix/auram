import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { sessionsApi } from "../api/client";
import { useLeaveSession } from "../hooks/useSession";
import { usePodcast } from "../hooks/usePodcasts";
import SessionRoom from "../components/session/SessionRoom";

export default function SessionPage() {
  const { id: podcastId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: podcast } = usePodcast(podcastId);
  const leaveSession = useLeaveSession();

  // Create the session via a cached query so it fires exactly once and the
  // result survives React StrictMode's mount/unmount/mount in dev.
  const {
    data: session,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["create-session", podcastId],
    queryFn: () => sessionsApi.create(podcastId!),
    enabled: !!podcastId,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  // Poll session state for the current segment index.
  const { data: liveState } = useQuery({
    queryKey: ["session", session?.id],
    queryFn: () => sessionsApi.get(session!.id),
    enabled: !!session,
    refetchInterval: 3000,
  });

  const onLeave = async () => {
    if (session) await leaveSession.mutateAsync(session.id);
    // Drop the cached session so the next Go Live creates a fresh one.
    queryClient.removeQueries({ queryKey: ["create-session", podcastId] });
    navigate("/library");
  };

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-white p-8 text-center shadow-card">
        <p className="text-sm text-rose-600">
          Could not start the session. Is LiveKit running?{" "}
          <Link to="/library" className="underline">
            Back
          </Link>
        </p>
      </div>
    );
  }

  if (isLoading || !session || !session.token || !session.ws_url || !podcast) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-400" />
          <p className="text-sm text-[#565e74]">Starting live session…</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.ws_url}
      connect
      audio={false}
      video={false}
      onDisconnected={() => {
        queryClient.removeQueries({ queryKey: ["create-session", podcastId] });
        navigate("/library");
      }}
    >
      <SessionRoom
        podcast={podcast}
        currentIndex={liveState?.current_segment_index ?? 0}
        onLeave={onLeave}
        sessionId={session?.id}
      />
    </LiveKitRoom>
  );
}
