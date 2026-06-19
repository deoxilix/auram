"""LLM output schemas for script generation (parsed, then mapped to DB models)."""
from pydantic import BaseModel, Field

from app.models.enums import SegmentType


class LLMSegment(BaseModel):
    speaker_id: str = Field(description="One of: host, guest")
    text: str
    segment_type: SegmentType = SegmentType.TOPIC
    topic_tags: list[str] = Field(default_factory=list)
    cues: dict = Field(default_factory=dict)


class LLMScript(BaseModel):
    title: str
    overview: str
    segments: list[LLMSegment]
