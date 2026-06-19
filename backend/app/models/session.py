"""Live session, conversation turn, and interruption persistence models."""
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel

from app.models.enums import InterruptionAction, SessionStatus


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class LiveSession(SQLModel, table=True):
    __tablename__ = "live_sessions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    script_id: UUID = Field(foreign_key="podcast_scripts.id", index=True)
    user_id: UUID | None = Field(default=None, index=True)
    livekit_room_name: str = Field(index=True)
    status: SessionStatus = Field(default=SessionStatus.WAITING)
    current_segment_index: int = 0
    started_at: datetime | None = None
    ended_at: datetime | None = None
    created_at: datetime = Field(default_factory=_now)


class ConversationTurn(SQLModel, table=True):
    __tablename__ = "conversation_turns"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="live_sessions.id", index=True)
    speaker_id: str  # "host", "guest", "user"
    text: str = Field(sa_column=Column(Text))
    audio_url: str | None = None
    segment_index: int = 0
    is_interruption: bool = False
    interruption_target: str | None = None
    timestamp: datetime = Field(default_factory=_now)


class InterruptionEvent(SQLModel, table=True):
    __tablename__ = "interruption_events"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="live_sessions.id", index=True)
    user_text: str = Field(sa_column=Column(Text))
    host_response: str = Field(default="", sa_column=Column(Text))
    action_taken: InterruptionAction = InterruptionAction.ACKNOWLEDGE
    resolved: bool = False
    timestamp: datetime = Field(default_factory=_now)
