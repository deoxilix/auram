"""PDF extraction via PyMuPDF with basic layout preservation."""
import fitz  # PyMuPDF

from app.services.ingestion.extractors import ExtractionResult


async def extract_pdf(data: bytes, filename: str | None = None) -> ExtractionResult:
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        pages: list[str] = []
        for page in doc:
            pages.append(page.get_text("text"))
        raw = "\n\n".join(pages)

        info = doc.metadata or {}
        title = info.get("title") or (filename or "Untitled PDF")
        metadata = {
            "author": info.get("author"),
            "page_count": doc.page_count,
            "word_count": len(raw.split()),
        }
    finally:
        doc.close()

    if not raw.strip():
        raise ValueError("PDF contained no extractable text (may be scanned images)")

    return ExtractionResult(title=title, raw_content=raw, metadata=metadata)
