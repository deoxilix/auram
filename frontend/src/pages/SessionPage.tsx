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

  // Read provider from URL query param, default to the env-configured provider.
  const searchParams = new URLSearchParams(window.location.search);
  const overriddenProvider = searchParams.get("provider");

  const queryFn = overriddenProvider
    ? () => sessionsApi.create(podcastId!, overriddenProvider)
    : () => sessionsApi.create(podcastId!);

  // Create the session via a cached query so it fires exactly once and the
  // result survives React StrictMode's mount/unmount/mount in dev.
  const {
    data: session,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["create-session", podcastId],
    queryFn: queryFn,
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
    queryClient.removeQueries({ queryKey: ["create-session", podcastId] });
    navigate("/library");
  };

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-white p-8 text-center shadow-card">
        <p className="text-sm text-rose-600">
          Could not start the session. Is the backend running?{" "}
          <Link to="/library" className="underline">
            Back
          </Link>
        </p>
      </div>
    );
  }

  if (isLoading || !session || !podcast) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-400" />
          <p className="text-sm text-[#565e74]">Starting live session…</p>
        </div>
      </div>
    );
  }

  const currentIndex = liveState?.current_segment_index ?? 0;

  // VAPI audio provider path.
  if (session.audio_provider === "vapi") {
    if (!session.vapi_public_key || !session.vapi_assistant_id) {
      return (
        <div className="rounded-xl border border-rose-200 bg-white p-8 text-center shadow-card">
          <p className="text-sm text-rose-600">
            VAPI is not configured. Set VAPI_PUBLIC_KEY and VAPI_ASSISTANT_ID.{" "}
            <Link to="/library" className="underline">
              Back
            </Link>
          </p>
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

  // LiveKit audio provider path (fallback).
  if (!session.token || !session.ws_url) {
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
        currentIndex={currentIndex}
        onLeave={onLeave}
        sessionId={session?.id}
      />
    </LiveKitRoom>
  );
}
