"""Unit tests for ingestion pure-logic components."""
from app.models.enums import DocumentType
from app.services.ingestion.chunker import chunk_document
from app.services.ingestion.cleaners import clean_content


def test_clean_content_normalizes_whitespace():
    raw = "Hello   world\r\n\r\n\r\n\r\nNext   paragraph"
    cleaned = clean_content(raw, DocumentType.TEXT)
    assert "   " not in cleaned
    assert "\n\n\n" not in cleaned
    assert "Hello world" in cleaned


def test_clean_content_strips_boilerplate():
    raw = "Real content here.\nSubscribe to our newsletter\nMore real content."
    cleaned = clean_content(raw, DocumentType.URL)
    assert "Subscribe to our newsletter" not in cleaned
    assert "Real content here." in cleaned


def test_chunk_document_produces_indexed_chunks():
    text = " ".join(f"Sentence number {i} with some filler words." for i in range(400))
    chunks = chunk_document(text, base_metadata={"title": "T"})
    assert len(chunks) > 1
    assert [c.chunk_index for c in chunks] == list(range(len(chunks)))
    assert all(c.metadata["title"] == "T" for c in chunks)
    assert all(c.token_count > 0 for c in chunks)


def test_chunk_document_empty_returns_nothing():
    assert chunk_document("") == []
