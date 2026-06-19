"""Default speaker profiles and voice assignment.

Voice IDs here are OpenAI TTS voices; provider abstraction in the TTS layer maps
these to provider-specific voices when a different provider is selected.
"""
from app.models.podcast import SpeakerProfile
from app.models.schemas import ScriptParams


def default_speakers(params: ScriptParams) -> list[SpeakerProfile]:
    return [
        SpeakerProfile(
            id="host",
            name="Alex",
            voice_id="alloy",
            personality=params.host_personality,
            is_user=False,
        ),
        SpeakerProfile(
            id="guest",
            name="Sam",
            voice_id="nova",
            personality=params.guest_personality,
            is_user=False,
        ),
        SpeakerProfile(
            id="user",
            name="You",
            voice_id="echo",
            personality="The human participant who can join, interrupt, and ask questions.",
            is_user=True,
        ),
    ]
