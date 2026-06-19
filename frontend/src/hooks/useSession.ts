import { useMutation } from "@tanstack/react-query";
import { sessionsApi } from "../api/client";

export function useCreateSession() {
  return useMutation({
    mutationFn: (podcastId: string) => sessionsApi.create(podcastId),
  });
}

export function useLeaveSession() {
  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.leave(sessionId),
  });
}
