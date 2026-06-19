"""Script validation and duration estimation."""
from app.models.enums import SegmentType
from app.services.script_generator.models import LLMScript

WORDS_PER_MINUTE = 150


def estimate_segment_duration_sec(text: str, cues: dict | None = None) -> float:
    words = len(text.split())
    base = (words / WORDS_PER_MINUTE) * 60.0
    pause = float((cues or {}).get("pause_after", 0.0) or 0.0)
    return round(base + pause, 2)


def estimate_total_duration_sec(script: LLMScript) -> int:
    return int(
        sum(estimate_segment_duration_sec(s.text, s.cues) for s in script.segments)
    )


def validate_script(script: LLMScript) -> list[str]:
    """Return a list of validation warnings (empty list = clean)."""
    warnings: list[str] = []
    if not script.segments:
        warnings.append("Script has no segments")
        return warnings

    speakers = {s.speaker_id for s in script.segments}
    unexpected = speakers - {"host", "guest"}
    if unexpected:
        warnings.append(f"Unexpected speaker ids: {sorted(unexpected)}")

    types = {s.segment_type for s in script.segments}
    if SegmentType.INTRO not in types:
        warnings.append("Missing intro segment")
    if SegmentType.OUTRO not in types:
        warnings.append("Missing outro segment")

    if len(script.segments) < 4:
        warnings.append("Very short script (<4 segments)")

    return warnings
