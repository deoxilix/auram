"""Provider factory — config-based TTS provider selection."""
from functools import lru_cache

from app.core.config import settings
from app.services.tts.providers.base import TTSProvider
from app.services.tts.providers.openai import OpenAITTSProvider


@lru_cache
def get_provider(name: str | None = None) -> TTSProvider:
    provider = name or settings.default_tts_provider
    if provider == "openai":
        return OpenAITTSProvider()
    # elevenlabs / kokoro land in Phase 3; fall back to OpenAI for now.
    raise ValueError(f"TTS provider not yet implemented: {provider}")
