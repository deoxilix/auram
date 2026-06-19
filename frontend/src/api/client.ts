import axios from "axios";
import type {
  AudioManifest,
  DocumentResponse,
  DocumentType,
  PodcastResponse,
  ScriptParams,
} from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  headers: { "Content-Type": "application/json" },
});

export const documentsApi = {
  list: () => api.get<DocumentResponse[]>("/api/v1/documents").then((r) => r.data),

  get: (id: string) =>
    api.get<DocumentResponse>(`/api/v1/documents/${id}`).then((r) => r.data),

  create: (payload: { type: DocumentType; source: string; title?: string }) =>
    api.post<DocumentResponse>("/api/v1/documents", payload).then((r) => r.data),

  upload: (file: File, title?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (title) form.append("title", title);
    return api
      .post<DocumentResponse>("/api/v1/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};

export const podcastsApi = {
  list: () => api.get<PodcastResponse[]>("/api/v1/podcasts").then((r) => r.data),

  get: (id: string) =>
    api.get<PodcastResponse>(`/api/v1/podcasts/${id}`).then((r) => r.data),

  generate: (document_id: string, params: ScriptParams) =>
    api
      .post<PodcastResponse>("/api/v1/podcasts/generate", { document_id, params })
      .then((r) => r.data),

  generateAudio: (id: string) =>
    api.post(`/api/v1/podcasts/${id}/audio/generate`).then((r) => r.data),

  audioManifest: (id: string) =>
    api.get<AudioManifest>(`/api/v1/podcasts/${id}/audio`).then((r) => r.data),
};

export default api;
