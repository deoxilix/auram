"""Script generation orchestration: document → LLM → structured podcast script."""
from uuid import UUID

from openai import AsyncOpenAI
from sqlmodel import select

from app.core.config import settings
from app.core.database import async_session_factory
from app.core.logging import get_logger
from app.models.enums import DocumentStatus, PodcastStatus
from app.models.document import SourceDocument
from app.models.podcast import PodcastScript, ScriptSegment
from app.models.schemas import ScriptParams
from app.services.script_generator.models import LLMScript
from app.services.script_generator.prompts import SYSTEM_PROMPT, build_user_prompt
from app.services.script_generator.validator import (
    estimate_segment_duration_sec,
    estimate_total_duration_sec,
    validate_script,
)
from app.services.script_generator.voices import default_speakers

log = get_logger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def create_pending_script(document_id: UUID, params: ScriptParams) -> PodcastScript:
    """Validate the document and create a PENDING PodcastScript row."""
    async with async_session_factory() as session:
        doc = await session.get(SourceDocument, document_id)
        if doc is None:
            raise ValueError(f"Document not found: {document_id}")
        if doc.status != DocumentStatus.READY:
            raise ValueError(
                f"Document not ready (status={doc.status}); ingest it first"
            )

        script = PodcastScript(
            document_id=document_id,
            title=doc.title,
            overview="",
            speakers=[s.model_dump() for s in default_speakers(params)],
            status=PodcastStatus.PENDING,
        )
        session.add(script)
        await session.commit()
        await session.refresh(script)
    log.info("script_created", script_id=str(script.id), doc_id=str(document_id))
    return script


async def run_generation(document_id: UUID, params: ScriptParams) -> None:
    """Generate the script for the most recent PENDING script of a document."""
    async with async_session_factory() as session:
        doc = await session.get(SourceDocument, document_id)
        stmt = (
            select(PodcastScript)
            .where(PodcastScript.document_id == document_id)
            .where(PodcastScript.status == PodcastStatus.PENDING)
            .order_by(PodcastScript.created_at.desc())
        )
        script = (await session.exec(stmt)).first()
        if doc is None or script is None:
            raise ValueError("Document or pending script not found")
        script.status = PodcastStatus.GENERATING
        session.add(script)
        await session.commit()
        script_id = script.id
        content = doc.cleaned_content

    try:
        client = _get_client()
        resp = await client.chat.completions.create(
            model=settings.script_model,
            response_format={"type": "json_object"},
            temperature=0.7,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(content, params)},
            ],
        )
        raw = resp.choices[0].message.content or "{}"
        llm_script = LLMScript.model_validate_json(raw)

        warnings = validate_script(llm_script)
        if warnings:
            log.warning("script_validation_warnings", script_id=str(script_id),
                        warnings=warnings)

        segments = [
            ScriptSegment(
                script_id=script_id,
                speaker_id=s.speaker_id,
                text=s.text,
                sequence=i,
                segment_type=s.segment_type,
                topic_tags=s.topic_tags,
                cues=s.cues,
                estimated_duration_sec=estimate_segment_duration_sec(s.text, s.cues),
            )
            for i, s in enumerate(llm_script.segments)
        ]

        async with async_session_factory() as session:
            session.add_all(segments)
            script = await session.get(PodcastScript, script_id)
            script.title = llm_script.title or script.title
            script.overview = llm_script.overview
            script.estimated_duration_sec = estimate_total_duration_sec(llm_script)
            script.status = PodcastStatus.READY
            session.add(script)
            await session.commit()
        log.info("generation_complete", script_id=str(script_id),
                 segments=len(segments))

    except Exception as exc:  # noqa: BLE001 — record failure on the script
        log.error("generation_failed", script_id=str(script_id), error=str(exc))
        async with async_session_factory() as session:
            script = await session.get(PodcastScript, script_id)
            if script is not None:
                script.status = PodcastStatus.FAILED
                script.error = str(exc)
                session.add(script)
                await session.commit()
        raise


async def get_script(script_id: UUID) -> tuple[PodcastScript, list[ScriptSegment]] | None:
    async with async_session_factory() as session:
        script = await session.get(PodcastScript, script_id)
        if script is None:
            return None
        stmt = (
            select(ScriptSegment)
            .where(ScriptSegment.script_id == script_id)
            .order_by(ScriptSegment.sequence)
        )
        segments = list((await session.exec(stmt)).all())
        return script, segments


async def list_scripts() -> list[PodcastScript]:
    async with async_session_factory() as session:
        stmt = select(PodcastScript).order_by(PodcastScript.created_at.desc())
        return list((await session.exec(stmt)).all())
