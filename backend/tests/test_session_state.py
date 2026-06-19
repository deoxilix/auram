"""Unit tests for the host agent's session state machine."""
from uuid import uuid4

from app.agents.host_agent.state import Phase, SegmentView, SessionState


def _state() -> SessionState:
    segs = [
        SegmentView("host", "Welcome to the show", "intro", 0),
        SegmentView("guest", "Topic one details", "topic", 1),
        SegmentView("host", "Topic two details", "topic", 2),
        SegmentView("host", "Thanks for listening", "outro", 3),
    ]
    return SessionState(
        session_id=uuid4(),
        script_id=uuid4(),
        document_id=uuid4(),
        title="T",
        overview="o",
        segments=segs,
        speakers={},
    )


def test_starts_at_first_segment():
    s = _state()
    assert s.index == 0
    assert s.current().segment_type == "intro"
    assert not s.is_complete()


def test_advance_moves_and_syncs_phase():
    s = _state()
    s.advance()
    assert s.index == 1
    assert s.phase == Phase.TOPICS
    s.advance()
    s.advance()
    assert s.phase == Phase.OUTRO


def test_advance_past_end_marks_complete():
    s = _state()
    for _ in range(4):
        s.advance()
    assert s.is_complete()
    assert s.current() is None
    assert s.phase == Phase.ENDED


def test_progress_percent():
    s = _state()
    assert s.progress_percent() == 0
    s.advance()
    s.advance()
    assert s.progress_percent() == 50


def test_upcoming_topics_limit():
    s = _state()
    assert len(s.upcoming_topics(2)) == 2
    assert s.upcoming_topics(2)[0].startswith("Topic one")
