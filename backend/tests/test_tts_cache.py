"""Unit tests for the TTS content-addressed cache."""
from app.services.tts import cache


def test_cache_key_is_deterministic():
    args = dict(provider="openai", model="gpt-4o-mini-tts", voice_id="alloy", text="hi")
    assert cache.cache_key(**args) == cache.cache_key(**args)


def test_cache_key_varies_by_inputs():
    base = dict(provider="openai", model="m", voice_id="alloy", text="hi")
    assert cache.cache_key(**base) != cache.cache_key(**{**base, "text": "bye"})
    assert cache.cache_key(**base) != cache.cache_key(**{**base, "voice_id": "nova"})


def test_write_and_read_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr(cache.settings, "audio_storage_dir", str(tmp_path))
    key = cache.cache_key(provider="openai", model="m", voice_id="alloy", text="x")
    assert cache.cached_path(key, "mp3") is None
    cache.write_audio(key, "mp3", b"audio-bytes")
    found = cache.cached_path(key, "mp3")
    assert found is not None
    assert found.read_bytes() == b"audio-bytes"
