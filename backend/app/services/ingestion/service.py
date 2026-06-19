"""Ingestion orchestration: extract → clean → chunk → embed → store."""
import hashlib
from uuid import UUID

from sqlmodel import select

from app.core.database import async_session_factory
from app.core.logging import get_logger
from app.models.document import DocumentChunk, SourceDocument
from app.models.enums import DocumentStatus, DocumentType
from app.services.ingestion.chunker import chunk_document
from app.services.ingestion.cleaners import clean_content
from app.services.ingestion.embedder import embed_texts
from app.services.ingestion.extractors import ExtractionResult
from app.services.ingestion.extractors.pdf import extract_pdf
from app.services.ingestion.extractors.text import extract_text
from app.services.ingestion.extractors.url import extract_url
from app.services.rag import vectorstore

log = get_logger(__name__)


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def create_document(
    *,
    doc_type: DocumentType,
    source: str | None = None,
    file_bytes: bytes | None = None,
    filename: str | None = None,
    title: str | None = None,
    user_id: UUID | None = None,
) -> SourceDocument:
    """Extract + persist a document row in PENDING/PROCESSING state.

    Returns the stored document immediately; embedding happens in run_pipeline.
    """
    result: ExtractionResult
    if doc_type == DocumentType.URL:
        result = await extract_url(source or "")
    elif doc_type == DocumentType.PDF:
        if file_bytes is None:
            raise ValueError("PDF ingestion requires file bytes")
        result = await extract_pdf(file_bytes, filename)
    elif doc_type in (DocumentType.TEXT, DocumentType.FILE):
        result = await extract_text(source or "", title)
    else:
        raise ValueError(f"Unsupported document type: {doc_type}")

    cleaned = clean_content(result.raw_content, doc_type)

    doc = SourceDocument(
        user_id=user_id,
        type=doc_type,
        original_url=result.original_url,
        title=title or result.title,
        content_hash=content_hash(cleaned),
        raw_content=result.raw_content,
        cleaned_content=cleaned,
        doc_metadata=result.metadata,
        status=DocumentStatus.PENDING,
    )
    async with async_session_factory() as session:
        session.add(doc)
        await session.commit()
        await session.refresh(doc)
    log.info("document_created", doc_id=str(doc.id), type=doc_type, title=doc.title)
    return doc


async def run_pipeline(document_id: UUID) -> None:
    """Chunk, embed, and index a document. Updates status to READY/FAILED."""
    async with async_session_factory() as session:
        doc = await session.get(SourceDocument, document_id)
        if doc is None:
            raise ValueError(f"Document not found: {document_id}")
        doc.status = DocumentStatus.PROCESSING
        session.add(doc)
        await session.commit()
        cleaned = doc.cleaned_content
        base_meta = {"title": doc.title}

    try:
        chunks = chunk_document(cleaned, base_metadata=base_meta)
        if not chunks:
            raise ValueError("Document produced no chunks")

        # Persist chunk rows (without embeddings — those go to Qdrant).
        chunk_rows: list[DocumentChunk] = [
            DocumentChunk(
                document_id=document_id,
                content=c.content,
                chunk_index=c.chunk_index,
                token_count=c.token_count,
                chunk_metadata=c.metadata,
            )
            for c in chunks
        ]
        async with async_session_factory() as session:
            session.add_all(chunk_rows)
            await session.commit()
            for row in chunk_rows:
                await session.refresh(row)

        embeddings = await embed_texts([c.content for c in chunks])

        await vectorstore.ensure_collection()
        await vectorstore.upsert_chunks(
            document_id=document_id,
            chunk_ids=[row.id for row in chunk_rows],
            embeddings=embeddings,
            payloads=[
                {"chunk_index": row.chunk_index, "content": row.content}
                for row in chunk_rows
            ],
        )

        async with async_session_factory() as session:
            doc = await session.get(SourceDocument, document_id)
            doc.status = DocumentStatus.READY
            session.add(doc)
            await session.commit()
        log.info("ingestion_complete", doc_id=str(document_id), chunks=len(chunks))

    except Exception as exc:  # noqa: BLE001 — record failure on the document
        log.error("ingestion_failed", doc_id=str(document_id), error=str(exc))
        async with async_session_factory() as session:
            doc = await session.get(SourceDocument, document_id)
            if doc is not None:
                doc.status = DocumentStatus.FAILED
                doc.error = str(exc)
                session.add(doc)
                await session.commit()
        raise


async def list_documents(user_id: UUID | None = None) -> list[SourceDocument]:
    async with async_session_factory() as session:
        stmt = select(SourceDocument).order_by(SourceDocument.created_at.desc())
        if user_id is not None:
            stmt = stmt.where(SourceDocument.user_id == user_id)
        return list((await session.exec(stmt)).all())


async def get_document(document_id: UUID) -> SourceDocument | None:
    async with async_session_factory() as session:
        return await session.get(SourceDocument, document_id)
