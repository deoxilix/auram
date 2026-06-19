"""Direct text input extraction."""
from app.services.ingestion.extractors import ExtractionResult


async def extract_text(text: str, title: str | None = None) -> ExtractionResult:
    text = text.strip()
    if not text:
        raise ValueError("Empty text input")

    # Derive a title from the first line if not provided.
    derived = title or text.splitlines()[0][:80]
    return ExtractionResult(
        title=derived,
        raw_content=text,
        metadata={"word_count": len(text.split())},
    )
