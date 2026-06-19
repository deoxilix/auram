import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { podcastsApi } from "../api/client";
import type { ScriptParams } from "../types";

export function usePodcasts() {
  return useQuery({
    queryKey: ["podcasts"],
    queryFn: podcastsApi.list,
    refetchInterval: (query) => {
      const pods = query.state.data;
      const busy = pods?.some(
        (p) => p.status === "pending" || p.status === "generating",
      );
      return busy ? 2000 : false;
    },
  });
}

export function usePodcast(id: string | undefined) {
  return useQuery({
    queryKey: ["podcast", id],
    queryFn: () => podcastsApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const p = query.state.data;
      return p && (p.status === "pending" || p.status === "generating")
        ? 2000
        : false;
    },
  });
}

export function useGeneratePodcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      params,
    }: {
      documentId: string;
      params: ScriptParams;
    }) => podcastsApi.generate(documentId, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["podcasts"] }),
  });
}

export function useAudioManifest(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["audio", id],
    queryFn: () => podcastsApi.audioManifest(id!),
    enabled: !!id && enabled,
    refetchInterval: (query) => (query.state.data?.ready ? false : 2000),
  });
}

export function useGenerateAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => podcastsApi.generateAudio(id),
    onSuccess: (_d, id) => qc.invalidateQueries({ queryKey: ["audio", id] }),
  });
}
