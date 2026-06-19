"""Podcast generation REST endpoints."""
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings
from app.models.podcast import PodcastScript, ScriptSegment, SpeakerProfile
from app.models.schemas import GenerateRequest, PodcastResponse, SegmentResponse
from app.services.script_generator import service
from app.workers.tasks import dispatch_generation, dispatch_tts

router = APIRouter(prefix="/podcasts", tags=["podcasts"])


def _script_to_response(
    script: PodcastScript, segments: list[ScriptSegment]
) -> PodcastResponse:
    return PodcastResponse(
        id=script.id,
        document_id=script.document_id,
        title=script.title,
        overview=script.overview,
        speakers=[SpeakerProfile(**s) for s in script.speakers],
        segments=[
            SegmentResponse(
                id=seg.id,
                speaker_id=seg.speaker_id,
                text=seg.text,
                sequence=seg.sequence,
                segment_type=seg.segment_type,
                topic_tags=seg.topic_tags,
                estimated_duration_sec=seg.estimated_duration_sec,
                cues=seg.cues,
                audio_path=seg.audio_path,
            )
            for seg in segments
        ],
        estimated_duration_sec=script.estimated_duration_sec,
        status=script.status,
        created_at=script.created_at,
        error=script.error,
    )


@router.post("/generate", response_model=PodcastResponse, status_code=201)
async def generate_podcast(req: GenerateRequest) -> PodcastResponse:
    try:
        script = await service.create_pending_script(req.document_id, req.params)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    dispatch_generation(script.document_id, req.params)
    return _script_to_response(script, [])


@router.get("", response_model=list[PodcastResponse])
async def list_podcasts() -> list[PodcastResponse]:
    scripts = await service.list_scripts()
    return [_script_to_response(s, []) for s in scripts]


@router.get("/{podcast_id}", response_model=PodcastResponse)
async def get_podcast(podcast_id: UUID) -> PodcastResponse:
    result = await service.get_script(podcast_id)
    if result is None:
        raise HTTPException(404, "Podcast not found")
    script, segments = result
    return _script_to_response(script, segments)


@router.post("/{podcast_id}/audio/generate", status_code=202)
async def generate_audio(podcast_id: UUID) -> dict:
    """Trigger batch TTS synthesis for all segments of a podcast."""
    result = await service.get_script(podcast_id)
    if result is None:
        raise HTTPException(404, "Podcast not found")
    dispatch_tts(podcast_id)
    return {"status": "synthesizing", "podcast_id": str(podcast_id)}


@router.get("/{podcast_id}/audio")
async def get_audio_manifest(podcast_id: UUID) -> dict:
    """Return per-segment audio availability + URLs for the player."""
    result = await service.get_script(podcast_id)
    if result is None:
        raise HTTPException(404, "Podcast not found")
    _script, segments = result
    items = [
        {
            "segment_id": str(seg.id),
            "sequence": seg.sequence,
            "speaker_id": seg.speaker_id,
            "duration_sec": seg.estimated_duration_sec,
            "ready": seg.audio_path is not None,
            "audio_url": (
                f"{settings.api_v1_prefix}/podcasts/{podcast_id}/audio/{seg.id}"
                if seg.audio_path
                else None
            ),
        }
        for seg in segments
    ]
    return {
        "podcast_id": str(podcast_id),
        "ready": bool(segments) and all(i["ready"] for i in items),
        "segments": items,
    }


@router.get("/{podcast_id}/audio/{segment_id}")
async def get_segment_audio(podcast_id: UUID, segment_id: UUID) -> FileResponse:
    """Serve a single segment's audio file."""
    result = await service.get_script(podcast_id)
    if result is None:
        raise HTTPException(404, "Podcast not found")
    _script, segments = result
    seg = next((s for s in segments if s.id == segment_id), None)
    if seg is None or seg.audio_path is None:
        raise HTTPException(404, "Segment audio not available")
    path = Path(settings.audio_storage_dir) / seg.audio_path
    if not path.exists():
        raise HTTPException(404, "Audio file missing on disk")
    return FileResponse(path, media_type="audio/mpeg")
