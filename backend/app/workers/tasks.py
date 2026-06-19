"""Background jobs + dispatch helpers.

Dispatch helpers route work either to Celery (settings.use_celery=True, needs a
running broker + worker) or to an in-process asyncio task for simple local dev.
"""
import asyncio
from uuid import UUID

from app.core.config import settings
from app.core.logging import get_logger
from app.workers.celery_app import celery_app

log = get_logger(__name__)


# ---- Celery tasks (sync wrappers around async pipelines) ----
@celery_app.task(name="ingest_document")
def ingest_document_task(document_id: str) -> None:
    from app.services.ingestion.service import run_pipeline

    asyncio.run(run_pipeline(UUID(document_id)))


@celery_app.task(name="generate_script")
def generate_script_task(document_id: str, params: dict) -> None:
    from app.models.schemas import ScriptParams
    from app.services.script_generator.service import run_generation

    asyncio.run(run_generation(UUID(document_id), ScriptParams(**params)))


@celery_app.task(name="synthesize_script")
def synthesize_script_task(script_id: str) -> None:
    from app.services.tts.pipeline import synthesize_script

    asyncio.run(synthesize_script(UUID(script_id)))


# ---- Dispatch helpers ----
def _run_in_background(coro) -> None:
    """Schedule a coroutine on the running loop, or run it in a fresh loop."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        asyncio.run(coro)


def dispatch_ingestion(document_id: UUID) -> None:
    if settings.use_celery:
        ingest_document_task.delay(str(document_id))
    else:
        from app.services.ingestion.service import run_pipeline

        log.info("dispatch_ingestion_inline", doc_id=str(document_id))
        _run_in_background(run_pipeline(document_id))


def dispatch_generation(document_id: UUID, params) -> None:
    if settings.use_celery:
        generate_script_task.delay(str(document_id), params.model_dump(mode="json"))
    else:
        from app.services.script_generator.service import run_generation

        log.info("dispatch_generation_inline", doc_id=str(document_id))
        _run_in_background(run_generation(document_id, params))


def dispatch_tts(script_id: UUID) -> None:
    if settings.use_celery:
        synthesize_script_task.delay(str(script_id))
    else:
        from app.services.tts.pipeline import synthesize_script

        log.info("dispatch_tts_inline", script_id=str(script_id))
        _run_in_background(synthesize_script(script_id))
