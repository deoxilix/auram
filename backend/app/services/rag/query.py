"""Retrieval helper for grounded answers during a live session."""
from uuid import UUID

from app.core.logging import get_logger
from app.services.ingestion.embedder import embed_texts
from app.services.rag import vectorstore

log = get_logger(__name__)


async def retrieve_context(question: str, document_id: UUID, k: int = 5) -> str:
    """Embed the question, search the document's chunks, return joined context."""
    try:
        vectors = await embed_texts([question])
        if not vectors:
            return ""
        results = await vectorstore.search(
            query_vector=vectors[0], document_id=document_id, k=k
        )
        passages = [
            str(r.payload.get("content", "")) for r in results if r.payload
        ]
        return "\n\n".join(p for p in passages if p)
    except Exception as exc:  # noqa: BLE001 — answer can proceed without RAG
        log.warning("rag_retrieve_failed", error=str(exc))
        return ""
