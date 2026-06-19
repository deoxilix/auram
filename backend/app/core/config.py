"""Application configuration loaded from environment variables."""
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env by absolute path so config loads regardless of the working
# directory (the LiveKit agent runs job subprocesses from a different CWD).
# backend/app/core/config.py -> parents: [core, app, backend, repo-root]
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_REPO_ROOT = _BACKEND_DIR.parent
# Later files take priority; backend/.env wins over the repo-root .env.
_ENV_FILES = (_REPO_ROOT / ".env", _BACKEND_DIR / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(p) for p in _ENV_FILES], extra="ignore"
    )

    # App
    app_env: Literal["development", "staging", "production"] = "development"
    secret_key: str = "dev-secret-change-me"
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/auram"
    redis_url: str = "redis://localhost:6379/0"

    # Vector DB
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None
    qdrant_collection: str = "auram_chunks"

    # LiveKit
    livekit_api_key: str = "devkey"
    livekit_api_secret: str = "secret"
    # ws/wss URL the agent + clients connect to.
    livekit_ws_url: str = "ws://localhost:7880"

    # Realtime host agent (use the GA model; override in .env if needed)
    realtime_model: str = "gpt-realtime"
    realtime_voice: str = "alloy"

    # AI providers
    openai_api_key: str = ""
    elevenlabs_api_key: str | None = None
    deepgram_api_key: str | None = None

    default_tts_provider: Literal["openai", "elevenlabs", "kokoro"] = "openai"
    default_stt_provider: Literal["openai", "deepgram"] = "openai"

    # Models
    script_model: str = "gpt-4o"
    embedding_model: str = "text-embedding-3-large"
    embedding_dim: int = 3072
    tts_model: str = "gpt-4o-mini-tts"

    # Celery
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/1"
    # When false, long-running jobs run in-process (no broker needed for local dev).
    use_celery: bool = False

    # Storage for generated audio
    audio_storage_dir: str = "./storage/audio"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
