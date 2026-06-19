"""Document and chunk persistence models."""
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, Text
from sqlmodel import Field, SQLModel

from app.models.enums import DocumentStatus, DocumentType


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class SourceDocument(SQLModel, table=True):
    __tablename__ = "source_documents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID | None = Field(default=None, index=True)
    type: DocumentType
    original_url: str | None = None
    title: str
    content_hash: str = Field(index=True)
    raw_content: str = Field(sa_column=Column(Text))
    cleaned_content: str = Field(sa_column=Column(Text))
    doc_metadata: dict = Field(default_factory=dict, sa_column=Column("metadata", JSON))
    status: DocumentStatus = Field(default=DocumentStatus.PENDING)
    error: str | None = None
    created_at: datetime = Field(default_factory=_now)


class DocumentChunk(SQLModel, table=True):
    __tablename__ = "document_chunks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="source_documents.id", index=True)
    content: str = Field(sa_column=Column(Text))
    chunk_index: int
    token_count: int = 0
    chunk_metadata: dict = Field(default_factory=dict, sa_column=Column("metadata", JSON))
    # Embedding vector itself lives in Qdrant, keyed by this chunk id.
