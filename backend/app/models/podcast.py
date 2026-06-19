"""Podcast script, speaker, and segment persistence models."""
from datetime import datetime, timezone
from uuid import UUID, uuid4

from pydantic import BaseModel
from sqlalchemy import JSON, Column, Text
from sqlmodel import Field, SQLModel

from app.models.enums import PodcastStatus, SegmentType


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class SpeakerProfile(BaseModel):
    """Embedded in PodcastScript.speakers (stored as JSON)."""

    id: str  # "host", "guest", "user"
    name: str
    voice_id: str
    voice_settings: dict = {}
    personality: str = ""
    is_user: bool = False


class PodcastScript(SQLModel, table=True):
    __tablename__ = "podcast_scripts"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="source_documents.id", index=True)
    title: str
    overview: str = Field(sa_column=Column(Text))
    speakers: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    estimated_duration_sec: int = 0
    status: PodcastStatus = Field(default=PodcastStatus.PENDING)
    error: str | None = None
    created_at: datetime = Field(default_factory=_now)


class ScriptSegment(SQLModel, table=True):
    __tablename__ = "script_segments"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    script_id: UUID = Field(foreign_key="podcast_scripts.id", index=True)
    speaker_id: str
    text: str = Field(sa_column=Column(Text))
    sequence: int
    segment_type: SegmentType = SegmentType.TOPIC
    topic_tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    estimated_duration_sec: float = 0.0
    cues: dict = Field(default_factory=dict, sa_column=Column(JSON))
    # Path/URL to pre-generated audio for this segment (set by TTS pipeline).
    audio_path: str | None = None
