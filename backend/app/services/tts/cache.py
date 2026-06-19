"""Content-addressed file cache for synthesized audio segments.

Keyed by hash(provider + model + voice + text) so identical segments are only
synthesized once, even across regenerations and sessions.
"""
import hashlib
from pathlib import Path

from app.core.config import settings


def _storage_dir() -> Path:
    path = Path(settings.audio_storage_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def cache_key(*, provider: str, model: str, voice_id: str, text: str) -> str:
    raw = f"{provider}|{model}|{voice_id}|{text}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def cached_path(key: str, extension: str) -> Path | None:
    path = _storage_dir() / f"{key}.{extension}"
    return path if path.exists() else None


def write_audio(key: str, extension: str, audio: bytes) -> Path:
    path = _storage_dir() / f"{key}.{extension}"
    path.write_bytes(audio)
    return path
