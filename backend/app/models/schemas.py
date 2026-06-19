"""API request/response schemas (not persisted tables)."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import DocumentStatus, DocumentType, PodcastStatus, SegmentType, Tone
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
