"""OpenAI TTS provider (gpt-4o-mini-tts)."""
from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from app.core.config import settings
from app.services.tts.providers.base import AudioResult, VoiceProfile

# Canonical voice ids map directly to OpenAI voices.
_OPENAI_VOICES = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}


class OpenAITTSProvider:
    name = "openai"

    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    def map_voice(self, voice_id: str) -> str:
        return voice_id if voice_id in _OPENAI_VOICES else "alloy"

    async def synthesize(self, text: str, voice: VoiceProfile) -> AudioResult:
        async with self._client.audio.speech.with_streaming_response.create(
            model=settings.tts_model,
            voice=self.map_voice(voice.voice_id),
            input=text,
            response_format="mp3",
        ) as resp:
            audio = await resp.read()
        return AudioResult(audio=audio, content_type="audio/mpeg", extension="mp3")

    async def synthesize_stream(
        self, text: str, voice: VoiceProfile
    ) -> AsyncIterator[bytes]:
        async with self._client.audio.speech.with_streaming_response.create(
            model=settings.tts_model,
            voice=self.map_voice(voice.voice_id),
            input=text,
            response_format="opus",
        ) as resp:
            async for chunk in resp.iter_bytes():
                yield chunk
