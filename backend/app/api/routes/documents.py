"""Document ingestion REST endpoints."""
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.enums import DocumentType
from app.models.schemas import DocumentResponse, IngestRequest
from app.services.ingestion import service
from app.workers.tasks import dispatch_ingestion

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_response(doc) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        type=doc.type,
        title=doc.title,
        original_url=doc.original_url,
        status=doc.status,
        metadata=doc.doc_metadata,
        created_at=doc.created_at,
        error=doc.error,
    )


@router.post("", response_model=DocumentResponse, status_code=201)
async def create_document(req: IngestRequest) -> DocumentResponse:
    """Ingest a URL or raw text. For PDFs use POST /documents/upload."""
    if req.type not in (DocumentType.URL, DocumentType.TEXT):
        raise HTTPException(400, "Use /documents/upload for file/PDF ingestion")
    try:
        doc = await service.create_document(
            doc_type=req.type, source=req.source, title=req.title
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    dispatch_ingestion(doc.id)
    return _to_response(doc)


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...), title: str | None = Form(None)
) -> DocumentResponse:
    """Ingest a PDF (or other) file via multipart upload."""
    data = await file.read()
    try:
        doc = await service.create_document(
            doc_type=DocumentType.PDF,
            file_bytes=data,
            filename=file.filename,
            title=title,
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    dispatch_ingestion(doc.id)
    return _to_response(doc)


@router.get("", response_model=list[DocumentResponse])
async def list_documents() -> list[DocumentResponse]:
    docs = await service.list_documents()
    return [_to_response(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: UUID) -> DocumentResponse:
    doc = await service.get_document(document_id)
    if doc is None:
        raise HTTPException(404, "Document not found")
    return _to_response(doc)
