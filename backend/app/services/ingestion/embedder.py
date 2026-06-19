"""Batch embedding via OpenAI embeddings API."""
from openai import AsyncOpenAI

from app.core.config import settings

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def embed_texts(texts: list[str], *, batch_size: int = 128) -> list[list[float]]:
    """Embed a list of texts, batching to respect API limits."""
    if not texts:
        return []
    client = _get_client()
    out: list[list[float]] = []
    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        resp = await client.embeddings.create(
            model=settings.embedding_model, input=batch
        )
        out.extend(item.embedding for item in resp.data)
    return out
