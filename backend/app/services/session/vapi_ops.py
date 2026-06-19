"""VAPI audio provider: build the runtime variables for a VAPI call.

The "Aarum Host (Alex)" assistant is configured on the VAPI dashboard with its
own persona/instructions and two template variables, `{{topic}}` and `{{script}}`.
The backend's only job is to render the generated podcast into those two values;
the browser SDK passes them as `assistantOverrides.variableValues` on start.
"""
from app.models.podcast import PodcastScript, ScriptSegment


def build_script_text(script: PodcastScript, segments: list[ScriptSegment]) -> str:
    """Render the script into the `{{script}}` variable for the VAPI assistant."""
    lines = [
        f"Segment {i + 1} ({seg.segment_type}): {seg.text}"
        for i, seg in enumerate(segments)
    ]
    body = "\n".join(lines) if lines else "(no segments)"
    overview = f"Overview: {script.overview}\n\n" if script.overview else ""
    return f"{overview}{body}"
