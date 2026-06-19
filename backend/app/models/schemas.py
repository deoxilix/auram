"""API request/response schemas (not persisted tables)."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import (
    DocumentStatus,
    DocumentType,
    PodcastStatus,
    SegmentType,
    SessionStatus,
    Tone,
)
from app.models.podcast import SpeakerProfile


# ---- Documents ----
class IngestRequest(BaseModel):
    type: DocumentType
    source: str  # URL, raw text, or (for files) handled via multipart
    title: str | None = None


class DocumentResponse(BaseModel):
    id: UUID
    type: DocumentType
    title: str
    original_url: str | None
    status: DocumentStatus
    metadata: dict
    created_at: datetime
    error: str | None = None


# ---- Podcasts ----
class ScriptParams(BaseModel):
    target_minutes: int = 10
    tone: Tone = Tone.CONVERSATIONAL
    host_personality: str = "curious, warm, accessible"
    guest_personality: str = "knowledgeable, enthusiastic, clear"
    include_hooks: bool = True


class GenerateRequest(BaseModel):
    document_id: UUID
    params: ScriptParams = Field(default_factory=ScriptParams)


class SegmentResponse(BaseModel):
    id: UUID
    speaker_id: str
    text: str
    sequence: int
    segment_type: SegmentType
    topic_tags: list[str]
    estimated_duration_sec: float
    cues: dict
    audio_path: str | None = None


class PodcastResponse(BaseModel):
    id: UUID
    document_id: UUID
    title: str
    overview: str
    speakers: list[SpeakerProfile]
    segments: list[SegmentResponse]
    estimated_duration_sec: int
    status: PodcastStatus
    created_at: datetime
    error: str | None = None


# ---- Sessions ----
class CreateSessionRequest(BaseModel):
    podcast_id: UUID


class SessionResponse(BaseModel):
    id: UUID
    script_id: UUID
    room_name: str
    status: SessionStatus
    current_segment_index: int
    # Which audio backend the client should use ("livekit" | "vapi").
    audio_provider: str = "livekit"
    # LiveKit connection details (populated on create/join).
    ws_url: str | None = None
    token: str | None = None
    # VAPI connection details (populated on create/join).
    vapi_public_key: str | None = None
    vapi_assistant_id: str | None = None
    script_context: str | None = None


class TurnResponse(BaseModel):
    id: UUID
    speaker_id: str
    text: str
    segment_index: int
    is_interruption: bool
    timestamp: datetime
