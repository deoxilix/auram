# Auram

Convert any content source (URLs, PDFs, text) into a conversational podcast.
Phase 1 (this milestone) covers: **content ingestion → script generation →
multi-speaker TTS → web audio player**. Live interactive sessions arrive in
Phase 2 (see `plan.md`).

## Architecture

- **Backend** — FastAPI (Python 3.11+), SQLModel, Celery, Qdrant, OpenAI
- **Frontend** — React 18 + TypeScript + Vite + Tailwind + TanStack Query
- See `architecture/` for the full design and `plan.md` for the phased roadmap.

## Prerequisites

You need **PostgreSQL**, **Redis**, and **Qdrant** running. The easiest path is
Docker Compose (note: Docker is **not** currently installed on this machine):

```bash
cp .env.example .env          # then fill in OPENAI_API_KEY
docker compose up -d postgres redis qdrant
```

If you don't have Docker, run the three services however you prefer (Homebrew
Postgres/Redis, a local Qdrant binary) and point the `.env` URLs at them.

An `OPENAI_API_KEY` is required for embeddings, script generation, and TTS.

## Backend

```bash
cd backend
uv venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[dev]"

uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Tables auto-create on startup (dev convenience). For real migrations, use
  Alembic.
- By default jobs run **in-process** (`USE_CELERY=false`) so no worker/broker is
  needed for local dev. Set `USE_CELERY=true` and run a worker to offload them:

```bash
celery -A app.workers.celery_app worker -l info
```

Run tests:

```bash
cd backend && source .venv/bin/activate && pytest -q
```

## Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:8000`, so no extra config is
needed when both run locally.

## End-to-end flow

1. **Upload** a URL / text / PDF on the Upload page → ingestion runs (extract →
   clean → chunk → embed → Qdrant).
2. When the document is **ready**, click **Generate Podcast** → GPT-4o produces a
   structured two-host script.
3. Open the podcast in the **Library**, click **Generate audio** → OpenAI TTS
   synthesizes each segment (cached on disk).
4. Play it back in the **audio player** with a synced transcript.

## API summary

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/documents` | Ingest URL or text |
| POST | `/api/v1/documents/upload` | Ingest a PDF (multipart) |
| GET | `/api/v1/documents` | List documents |
| GET | `/api/v1/documents/{id}` | Document status |
| POST | `/api/v1/podcasts/generate` | Generate a script |
| GET | `/api/v1/podcasts` | List podcasts |
| GET | `/api/v1/podcasts/{id}` | Script + segments |
| POST | `/api/v1/podcasts/{id}/audio/generate` | Synthesize audio |
| GET | `/api/v1/podcasts/{id}/audio` | Audio manifest |
| GET | `/api/v1/podcasts/{id}/audio/{segment_id}` | Stream a segment |
