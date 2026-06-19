"""Semantic-ish chunking via LlamaIndex SentenceSplitter (token-aware)."""
from dataclasses import dataclass

from llama_index.core.node_parser import SentenceSplitter


@dataclass
class ChunkData:
    content: str
    chunk_index: int
    token_count: int
    metadata: dict


# SentenceSplitter keeps sentence boundaries intact while targeting a token size.
_splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)


def chunk_document(content: str, *, base_metadata: dict | None = None) -> list[ChunkData]:
    base_metadata = base_metadata or {}
    if not content or not content.strip():
        return []
    pieces = [p for p in _splitter.split_text(content) if p.strip()]
    chunks: list[ChunkData] = []
    for i, piece in enumerate(pieces):
        chunks.append(
            ChunkData(
                content=piece,
                chunk_index=i,
                # Approximate token count; SentenceSplitter targets ~512.
                token_count=len(piece.split()),
                metadata=dict(base_metadata),
            )
        )
    return chunks
