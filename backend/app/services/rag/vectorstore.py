"""Qdrant vector store wrapper for chunk embeddings.

Embeddings are stored here keyed by DocumentChunk.id; chunk text/metadata also
live in Postgres. This module owns collection lifecycle, upsert, and search.
"""
from uuid import UUID

from qdrant_client import AsyncQdrantClient, models

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

_client: AsyncQdrantClient | None = None


def get_client() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(
            url=settings.qdrant_url, api_key=settings.qdrant_api_key
        )
    return _client


async def ensure_collection() -> None:
    client = get_client()
    existing = {c.name for c in (await client.get_collections()).collections}
    if settings.qdrant_collection in existing:
        return
    await client.create_collection(
        collection_name=settings.qdrant_collection,
        vectors_config=models.VectorParams(
            size=settings.embedding_dim, distance=models.Distance.COSINE
        ),
    )
    log.info("qdrant_collection_created", name=settings.qdrant_collection)


async def upsert_chunks(
    *,
    document_id: UUID,
    chunk_ids: list[UUID],
    embeddings: list[list[float]],
    payloads: list[dict],
) -> None:
    client = get_client()
    points = [
        models.PointStruct(
            id=str(cid),
            vector=emb,
            payload={"document_id": str(document_id), **payload},
        )
        for cid, emb, payload in zip(chunk_ids, embeddings, payloads, strict=True)
    ]
    await client.upsert(collection_name=settings.qdrant_collection, points=points)


async def search(
    *, query_vector: list[float], document_id: UUID | None = None, k: int = 5
) -> list[models.ScoredPoint]:
    client = get_client()
    flt = None
    if document_id is not None:
        flt = models.Filter(
            must=[
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchValue(value=str(document_id)),
                )
            ]
        )
    return await client.search(
        collection_name=settings.qdrant_collection,
        query_vector=query_vector,
        query_filter=flt,
        limit=k,
    )


async def delete_document(document_id: UUID) -> None:
    client = get_client()
    await client.delete(
        collection_name=settings.qdrant_collection,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=str(document_id)),
                    )
                ]
            )
        ),
    )
