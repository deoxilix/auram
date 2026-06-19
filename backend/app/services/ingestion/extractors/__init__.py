"""Content extractors return normalized (title, raw_content, metadata)."""
from dataclasses import dataclass, field


@dataclass
class ExtractionResult:
    title: str
    raw_content: str
    metadata: dict = field(default_factory=dict)
    original_url: str | None = None
