"""TTS pipeline: batch-synthesize all segments of a podcast script."""
from uuid import UUID

from sqlmodel import select

from app.core.config import settings
from app.core.database import async_session_factory
from app.core.logging import get_logger
from app.models.podcast import PodcastScript, ScriptSegment
from app.services.tts import cache
from app.services.tts.factory import get_provider
from app.services.tts.providers.base import VoiceProfile

log = get_logger(__name__)


async def synthesize_script(script_id: UUID, *, provider_name: str | None = None) -> int:
    """Synthesize audio for every segment. Returns count of segments synthesized.

    Cached segments are skipped. Each segment's audio_path is set to the stored
    filename (relative to AUDIO_STORAGE_DIR).
    """
    provider = get_provider(provider_name)

    async with async_session_factory() as session:
        script = await session.get(PodcastScript, script_id)
        if script is None:
            raise ValueError(f"Script not found: {script_id}")
        speakers = {s["id"]: s for s in script.speakers}
        stmt = (
            select(ScriptSegment)
            .where(ScriptSegment.script_id == script_id)
            .order_by(ScriptSegment.sequence)
        )
        segments = list((await session.exec(stmt)).all())

    synthesized = 0
    for seg in segments:
        speaker = speakers.get(seg.speaker_id, {})
        voice_id = speaker.get("voice_id", "alloy")
        key = cache.cache_key(
            provider=provider.name,
            model=settings.tts_model,
            voice_id=voice_id,
            text=seg.text,
        )

        existing = cache.cached_path(key, "mp3")
        if existing is None:
            result = await provider.synthesize(
                seg.text, VoiceProfile(voice_id=voice_id)
            )
            path = cache.write_audio(key, result.extension, result.audio)
            filename = path.name
            synthesized += 1
        else:
            filename = existing.name

        async with async_session_factory() as session:
            row = await session.get(ScriptSegment, seg.id)
            row.audio_path = filename
            session.add(row)
            await session.commit()

    log.info("tts_complete", script_id=str(script_id),
             total=len(segments), synthesized=synthesized)
    return synthesized
