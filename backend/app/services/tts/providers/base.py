"""TTS provider protocol and shared audio models."""
from collections.abc import AsyncIterator
from typing import Protocol, runtime_checkable

from pydantic import BaseModel


class VoiceProfile(BaseModel):
    voice_id: str
    settings: dict = {}


class AudioResult(BaseModel):
    audio: bytes
    content_type: str
    extension: str  # e.g. "mp3", "opus"

    model_config = {"arbitrary_types_allowed": True}


@runtime_checkable
class TTSProvider(Protocol):
    name: str

    async def synthesize(self, text: str, voice: VoiceProfile) -> AudioResult:
        """Synthesize full audio for a piece of text (batch use)."""
        ...

    async def synthesize_stream(
        self, text: str, voice: VoiceProfile
    ) -> AsyncIterator[bytes]:
        """Stream audio chunks (real-time use, Phase 2)."""
        ...

    def map_voice(self, voice_id: str) -> str:
        """Map a canonical voice id to this provider's voice identifier."""
        ...
