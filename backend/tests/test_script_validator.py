"""Unit tests for script validation and duration estimation."""
from app.models.enums import SegmentType
from app.services.script_generator.models import LLMScript, LLMSegment
from app.services.script_generator.validator import (
    estimate_segment_duration_sec,
    estimate_total_duration_sec,
    validate_script,
)


def _seg(text="hello world", stype=SegmentType.TOPIC, sid="host", cues=None):
    return LLMSegment(speaker_id=sid, text=text, segment_type=stype, cues=cues or {})


def test_duration_scales_with_word_count():
    short = estimate_segment_duration_sec("one two three")
    long = estimate_segment_duration_sec(" ".join(["word"] * 150))
    assert long > short
    # 150 words at 150 wpm ≈ 60s
    assert 55 <= long <= 65


def test_duration_includes_pause_cue():
    assert estimate_segment_duration_sec("hi", {"pause_after": 2.0}) >= 2.0


def test_validate_clean_script_has_no_warnings():
    script = LLMScript(
        title="T", overview="o",
        segments=[
            _seg(stype=SegmentType.INTRO),
            _seg(sid="guest"),
            _seg(),
            _seg(stype=SegmentType.OUTRO, sid="guest"),
        ],
    )
    assert validate_script(script) == []


def test_validate_flags_missing_intro_outro_and_bad_speaker():
    script = LLMScript(
        title="T", overview="o",
        segments=[_seg(sid="narrator"), _seg(sid="guest")],
    )
    warnings = validate_script(script)
    assert any("intro" in w for w in warnings)
    assert any("outro" in w for w in warnings)
    assert any("narrator" in w for w in warnings)


def test_total_duration_sums_segments():
    script = LLMScript(
        title="T", overview="o",
        segments=[_seg(" ".join(["w"] * 150)), _seg(" ".join(["w"] * 150))],
    )
    assert estimate_total_duration_sec(script) >= 110
