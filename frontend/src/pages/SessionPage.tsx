import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { sessionsApi } from "../api/client";
import { useLeaveSession } from "../hooks/useSession";
import { usePodcast } from "../hooks/usePodcasts";
import SessionRoom from "../components/session/SessionRoom";
import VapiSessionRoom from "../components/session/VapiSessionRoom";

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
      <div className="text-sm text-rose-600">
        Could not start the session. Is LiveKit running?{" "}
        <Link to="/library" className="underline">
          Back
        </Link>
      </div>
    );
  }

  if (isLoading || !session || !podcast) {
    return <p className="text-sm text-slate-500">Starting live session…</p>;
  }

  const currentIndex = liveState?.current_segment_index ?? 0;

  if (session.audio_provider === "vapi") {
    if (!session.vapi_public_key || !session.vapi_assistant_id) {
      return (
        <div className="text-sm text-rose-600">
          VAPI is not configured. Set VAPI_PUBLIC_KEY and VAPI_ASSISTANT_ID.{" "}
          <Link to="/library" className="underline">
            Back
          </Link>
        </div>
      );
    }
    return (
      <VapiSessionRoom
        podcast={podcast}
        publicKey={session.vapi_public_key}
        assistantId={session.vapi_assistant_id}
        scriptContext={session.script_context ?? ""}
        onLeave={onLeave}
      />
    );
  }

  if (!session.token || !session.ws_url) {
    return <p className="text-sm text-slate-500">Starting live session…</p>;
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
        currentIndex={currentIndex}
        onLeave={onLeave}
      />
    </LiveKitRoom>
  );
}
