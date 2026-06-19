"""Conversation state for the host agent: script position + phase machine."""
from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID


class Phase(StrEnum):
    WAITING = "waiting"
    INTRO = "intro"
    TOPICS = "topics"
    QA = "qa"
    OUTRO = "outro"
    ENDED = "ended"


@dataclass
class SegmentView:
    speaker_id: str
    text: str
    segment_type: str
    sequence: int


@dataclass
class SessionState:
    session_id: UUID
    script_id: UUID
    document_id: UUID
    title: str
    overview: str
    segments: list[SegmentView]
    speakers: dict[str, dict]  # speaker_id -> profile dict
    index: int = 0
    phase: Phase = Phase.WAITING
    deferred_questions: list[str] = field(default_factory=list)

    # ---- navigation ----
    def current(self) -> SegmentView | None:
        if 0 <= self.index < len(self.segments):
            return self.segments[self.index]
        return None

    def advance(self) -> SegmentView | None:
        self.index += 1
        self._sync_phase()
        return self.current()

    def upcoming_topics(self, n: int = 3) -> list[str]:
        nxt = self.segments[self.index + 1 : self.index + 1 + n]
        return [s.text[:80] for s in nxt]

    def is_complete(self) -> bool:
        return self.index >= len(self.segments)

    def progress_percent(self) -> int:
        if not self.segments:
            return 0
        return int(min(self.index, len(self.segments)) / len(self.segments) * 100)

    def _sync_phase(self) -> None:
        seg = self.current()
        if seg is None:
            self.phase = Phase.ENDED
            return
        mapping = {
            "intro": Phase.INTRO,
            "topic": Phase.TOPICS,
            "transition": Phase.TOPICS,
            "qa": Phase.QA,
            "outro": Phase.OUTRO,
        }
        self.phase = mapping.get(seg.segment_type, Phase.TOPICS)
