// Shared API DTOs (mirror backend app/models/schemas.py)

export type DocumentType = "url" | "pdf" | "text" | "file";
export type DocumentStatus = "pending" | "processing" | "ready" | "failed";
export type PodcastStatus = "pending" | "generating" | "ready" | "failed";
export type SegmentType = "intro" | "topic" | "transition" | "qa" | "outro";
export type Tone = "conversational" | "educational" | "storytelling";

export interface DocumentResponse {
  id: string;
  type: DocumentType;
  title: string;
  original_url: string | null;
  status: DocumentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  error: string | null;
}

export interface SpeakerProfile {
  id: string;
  name: string;
  voice_id: string;
  voice_settings: Record<string, unknown>;
  personality: string;
  is_user: boolean;
}

export interface SegmentResponse {
  id: string;
  speaker_id: string;
  text: string;
  sequence: number;
  segment_type: SegmentType;
  topic_tags: string[];
  estimated_duration_sec: number;
  cues: Record<string, unknown>;
  audio_path: string | null;
}

export interface PodcastResponse {
  id: string;
  document_id: string;
  title: string;
  overview: string;
  speakers: SpeakerProfile[];
  segments: SegmentResponse[];
  estimated_duration_sec: number;
  status: PodcastStatus;
  created_at: string;
  error: string | null;
}

export interface ScriptParams {
  target_minutes: number;
  tone: Tone;
  host_personality?: string;
  guest_personality?: string;
  include_hooks?: boolean;
}

export interface AudioManifestItem {
  segment_id: string;
  sequence: number;
  speaker_id: string;
  duration_sec: number;
  ready: boolean;
  audio_url: string | null;
}

export interface AudioManifest {
  podcast_id: string;
  ready: boolean;
  segments: AudioManifestItem[];
}

export type SessionStatus = "waiting" | "live" | "paused" | "ended";

export interface SessionResponse {
  id: string;
  script_id: string;
  room_name: string;
  status: SessionStatus;
  current_segment_index: number;
  ws_url: string | null;
  token: string | null;
}

export interface TurnResponse {
  id: string;
  speaker_id: string;
  text: string;
  segment_index: number;
  is_interruption: boolean;
  timestamp: string;
}
