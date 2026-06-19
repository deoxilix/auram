"""Shared enums for domain models."""
from enum import StrEnum


class DocumentType(StrEnum):
    URL = "url"
    PDF = "pdf"
    TEXT = "text"
    FILE = "file"


class DocumentStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class PodcastStatus(StrEnum):
    PENDING = "pending"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"


class SegmentType(StrEnum):
    INTRO = "intro"
    TOPIC = "topic"
    TRANSITION = "transition"
    QA = "qa"
    OUTRO = "outro"


class Tone(StrEnum):
    CONVERSATIONAL = "conversational"
    EDUCATIONAL = "educational"
    STORYTELLING = "storytelling"
