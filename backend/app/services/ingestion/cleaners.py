"""Content cleaning: normalize whitespace, fix encoding, strip boilerplate."""
import re
import unicodedata

from app.models.enums import DocumentType

# Lines that are very likely navigation / boilerplate noise.
_NOISE_PATTERNS = re.compile(
    r"^\s*(share this|subscribe|cookie|advertisement|related articles?|"
    r"sign up|newsletter|follow us|©|all rights reserved)\b",
    re.IGNORECASE,
)


def clean_content(raw: str, source_type: DocumentType) -> str:
    # Normalize unicode (fixes smart quotes, ligatures, etc.)
    text = unicodedata.normalize("NFKC", raw)

    # Collapse Windows line endings and excessive blank lines.
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    lines: list[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            lines.append("")
            continue
        if _NOISE_PATTERNS.match(stripped):
            continue
        lines.append(stripped)

    cleaned = "\n".join(lines)
    # Collapse 3+ newlines down to a paragraph break.
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    # Collapse runs of spaces.
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    return cleaned.strip()
