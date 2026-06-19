"""URL extraction via trafilatura with readability-style main-content detection."""
import trafilatura

from app.services.ingestion.extractors import ExtractionResult


async def extract_url(url: str) -> ExtractionResult:
    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        raise ValueError(f"Could not fetch URL: {url}")

    text = trafilatura.extract(
        downloaded,
        include_comments=False,
        include_tables=True,
        favor_precision=True,
    )
    if not text:
        raise ValueError(f"No extractable content at: {url}")

    meta = trafilatura.extract_metadata(downloaded)
    title = (meta.title if meta and meta.title else url)
    metadata = {
        "author": meta.author if meta else None,
        "date": meta.date if meta else None,
        "sitename": meta.sitename if meta else None,
        "word_count": len(text.split()),
    }
    return ExtractionResult(
        title=title, raw_content=text, metadata=metadata, original_url=url
    )
