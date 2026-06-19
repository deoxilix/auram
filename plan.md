# Auram — Engineering Plan

## Product Vision

A web app that converts any content source (URLs, PDFs, documents) into an interactive conversational podcast. The user joins as a third participant alongside two AI speakers, can interrupt at any time, ask questions, and steer the conversation — while an AI host maintains coherence and progresses through the material.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| State | Zustand + TanStack Query |
| Real-time (client) | LiveKit React SDK |
| Backend | FastAPI + Python 3.11+ |
| Real-time (server) | LiveKit Agents |
| AI Host | OpenAI GPT-4o Realtime API |
| Script Generation | GPT-4o / Claude Sonnet |
| TTS | OpenAI TTS (primary) → ElevenLabs / Kokoro |
| STT | Deepgram Nova-2 / OpenAI Whisper |
| RAG | LlamaIndex + Qdrant |
| Queue | Redis + Celery |
| Database | PostgreSQL (pgvector or Qdrant for embeddings) |
| Auth | Clerk / Supabase Auth |
| Deploy | Fly.io (backend) + Vercel (frontend) + LiveKit Cloud |

---

## Repository Structure

```
auram/
├── architecture/           # Design docs
├── backend/
│   └── app/
│       ├── main.py
│       ├── core/           # config, database, security
│       ├── api/routes/     # documents, podcasts, sessions
│       ├── services/
│       │   ├── ingestion/
│       │   ├── script_generator/
│       │   ├── tts/
│       │   ├── session/
│       │   └── rag/
│       ├── agents/host_agent/
│       ├── models/
│       └── workers/        # Celery tasks
├── frontend/
│   └── src/
│       ├── pages/          # Upload, Library, Session
│       ├── components/
│       ├── hooks/
│       ├── store/
│       ├── api/
│       └── utils/
├── shared/types/           # Pydantic → TypeScript generated types
├── docker-compose.yml
└── .env.example
```

---

## Core Data Models

- **SourceDocument** — ingested content with status tracking (`pending → processing → ready`)
- **DocumentChunk** — embedded chunks stored in vector DB for RAG
- **PodcastScript** — structured dialogue with speaker profiles and segment list
- **SpeakerProfile** — voice ID, TTS settings, personality prompt per speaker (`host`, `guest`, `user`)
- **ScriptSegment** — individual dialogue turn with type, topic tags, and cues
- **LiveSession** — LiveKit room state, current segment index, interruption history
- **ConversationTurn** — transcript record per utterance
- **InterruptionEvent** — classified user interruption with host response and action taken

---

## Phase 1 — Foundation & MVP (Weeks 1–3) — ✅ IMPLEMENTED

**Goal**: Upload content → generate podcast script → play as pre-generated audio. No live session yet.

> Status: backend (ingestion, script generation, TTS, Celery wiring) and
> frontend (Upload / Library / Player) are built and passing tests. Running the
> full flow requires Postgres + Redis + Qdrant and an `OPENAI_API_KEY`. See
> `README.md`.

### Backend

- [ ] Project scaffold: FastAPI + SQLModel + Alembic migrations + Celery
- [ ] Docker Compose: `postgres`, `redis`, `qdrant` services
- [ ] **Ingestion Service** (`services/ingestion/`)
  - URL extractor via `trafilatura`
  - PDF extractor via `PyMuPDF`
  - Plain text input
  - Content cleaner (strip nav, ads, fix encoding)
  - Semantic chunker via LlamaIndex
  - Batch embedder via OpenAI `text-embedding-3-large`
  - Store document + chunks to Postgres + Qdrant
  - REST: `POST /api/v1/documents`, `GET /api/v1/documents/{id}`
- [ ] **Script Generator** (`services/script_generator/`)
  - Build prompt from document content + `ScriptParams`
  - Call GPT-4o in JSON mode, parse into `PodcastScript` schema
  - Validate output (completeness, duration estimates)
  - Assign speaker profiles and voice IDs
  - REST: `POST /api/v1/podcasts/generate`, `GET /api/v1/podcasts/{id}`
- [ ] **TTS Pipeline** (`services/tts/`)
  - Provider abstraction protocol (`TTSProvider`)
  - OpenAI TTS provider (primary)
  - Batch synthesize all script segments → store audio per segment
  - Cache synthesized audio in Redis + local/object storage
  - REST: `GET /api/v1/podcasts/{id}/audio`

### Frontend

- [ ] Project scaffold: Vite + React 18 + TypeScript + Tailwind
- [ ] **Upload Page** — drag-drop PDF/URL/text, progress indicator (ingestion status polling)
- [ ] **Library Page** — podcast cards with metadata, play/delete actions
- [ ] **Audio Player** — segmented playback of pre-generated podcast, transcript panel
- [ ] API client (TanStack Query) wired to all backend endpoints

### Infrastructure

- [ ] `.env.example` with all required variables
- [ ] GitHub Actions CI: lint, typecheck, pytest
- [ ] Staging deploy

**Exit criteria**: User can upload a blog URL, get a generated 10-minute two-speaker podcast, and listen to it.

---

## Phase 2 — Live Sessions (Weeks 4–6)

**Goal**: Real-time conversational podcast via WebRTC. User can interrupt and ask questions.

### Backend

- [ ] **Session Manager** (`services/session/`)
  - Create LiveKit room, issue host + user tokens
  - Track session state: current segment index, history
  - Handle reconnection (resume at correct segment)
  - Session cleanup on end
  - REST: `POST /api/v1/sessions`, `POST /api/v1/sessions/{id}/join`
- [ ] **Host Agent** (`agents/host_agent/`)
  - `HostAgent` class extending `livekit_agents.llm.RealtimeAgent`
  - System prompt injection: script overview, current segment, upcoming topics
  - Function tools:
    - `get_current_segment()` → returns text for current position
    - `advance_segment()` → moves to next segment
    - `answer_question(question)` → RAG-backed answer from source doc
    - `defer_question(topic)` → marks for later, continues script
    - `get_conversation_summary()` → recent context for continuity
  - State machine: `WAITING → INTRO → TOPIC_SEGMENTS → Q&A → OUTRO → ENDED`
  - Interruption handling via `conversation.item.truncate`
  - Turn-taking: host speaks → guest speaks → invite user
- [ ] WebSocket / LiveKit data channel events for control messages

### Frontend

- [ ] **Session Page** (`pages/SessionPage.tsx`)
  - `AudioVisualizer` — animated waveform per speaker
  - `TranscriptPanel` — real-time scrolling transcript with speaker labels
  - `SegmentProgress` — visual progress through podcast topics
  - `InterruptionButton` — push-to-talk "Interrupt / Ask" button
  - `TopicSidebar` — upcoming topics, deferred questions list
  - Session controls: pause, volume, leave
- [ ] **LiveKit integration hooks**
  - `useLiveKitRoom()` — connection, participants
  - `useLocalAudio()` — microphone, VAD, push-to-talk
  - `useRemoteAudio()` — host and guest tracks
  - `useDataChannel()` — interrupt and segment-change control messages
  - `useTranscription()` — real-time STT for user speech display
- [ ] `SpeakerAvatar` — animated speaking indicator per participant
- [ ] Auto-reconnect on network drop

**Exit criteria**: User clicks "Go Live", joins a WebRTC room, listens to the AI host and guest work through the script, and can press interrupt to ask a question mid-conversation.

---

## Phase 3 — Polish & Production (Weeks 7–9)

**Goal**: Quality, reliability, user accounts, and production readiness.

### Product

- [ ] **Multi-voice TTS**: ElevenLabs Flash v2.5 for higher quality; Kokoro-82M as local fallback
- [ ] **RAG for grounded answers**: query Qdrant with user questions, inject retrieved chunks into host response
- [ ] Cross-encoder reranking on RAG results (Cohere Rerank v3.5 or local BGE-Reranker)
- [ ] **User accounts**: Clerk or Supabase Auth, session history persistence
- [ ] Script preview and editing before going live
- [ ] Podcast re-generation with feedback ("more casual", "shorter intro")
- [ ] Mobile-responsive UI

### Engineering

- [ ] Structured logging via `structlog` + Sentry error tracking
- [ ] Celery Flower dashboard for worker monitoring
- [ ] Rate limiting on ingestion and generation endpoints
- [ ] Shared types: `pydantic2ts` generates TypeScript types from Pydantic models
- [ ] OpenAPI schema generated from FastAPI → frontend consumes via `openapi-typescript`
- [ ] E2E tests: Playwright covering upload → generate → live session flow
- [ ] Production deploy: Fly.io (backend), Vercel (frontend), LiveKit Cloud

**Exit criteria**: Production app deployed, user auth working, monitoring in place, E2E tests green.

---

## Phase 4 — Advanced Features (Week 10+)

- [ ] Voice activity detection (VAD) always-on mode (toggle from push-to-talk)
- [ ] Multi-language podcast generation and TTS
- [ ] Collaborative sessions (multiple human participants)
- [ ] Export to RSS feed / podcast platforms
- [ ] Analytics dashboard: listening time, interruption frequency, popular topics
- [ ] Voice cloning for user's persona in session
- [ ] Local-first mode: Kokoro TTS + Whisper.cpp + local LLM (Ollama)

---

## Key API Contracts

### REST Endpoints

```
POST   /api/v1/documents              # Ingest content
GET    /api/v1/documents/{id}         # Poll ingestion status

POST   /api/v1/podcasts/generate      # Generate script
GET    /api/v1/podcasts/{id}          # Get script + metadata
GET    /api/v1/podcasts/{id}/audio    # Get pre-generated audio

POST   /api/v1/sessions               # Create live session → returns tokens
POST   /api/v1/sessions/{id}/join     # Get participant token
GET    /api/v1/sessions/{id}/history  # Conversation transcript
```

### Real-time Events (LiveKit Data Channel)

```
# Client → Server
user.speech.start  |  user.speech.end  |  user.interrupt

# Server → Client
host.speech.start  |  host.speech.audio  |  host.speech.end  |  session.state
```

---

## Interruption Flow

```
User presses Interrupt
  → Frontend sends data channel: { type: "user.interrupt", text: "..." }
  → Host Agent classifies: answer | defer | redirect | acknowledge
  → Host Agent sends conversation.item.truncate (stops current audio)
  → Host Agent responds per classification
  → Host Agent resumes or advances script
  → InterruptionEvent logged to session
```

## Build Order (Critical Path)

```
Week 1:  Ingestion Service (A1) + Script Generator (A2) + DevOps/Docker (D1) — parallel
Week 2:  TTS Pipeline (A3) + Ingestion/Script integration testing
Week 3:  Integration: Upload → Generate → Audio Player (full MVP)
Week 4:  Session Manager (B1) + Host Agent (B2) — parallel
Week 5:  LiveKit React integration (C2) + Session Page (C1) — parallel
Week 6:  E2E integration testing + RAG + staging deploy
Week 7+: Auth, polish, production deploy, Phase 3 items
```

---

## Environment Variables

```bash
# App
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
QDRANT_URL=http://qdrant:6333

# LiveKit
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_WS_URL=wss://...

# AI Providers
OPENAI_API_KEY=...
ELEVENLABS_API_KEY=          # optional
DEEPGRAM_API_KEY=            # optional
DEFAULT_TTS_PROVIDER=openai  # openai | elevenlabs | kokoro
DEFAULT_STT_PROVIDER=openai  # openai | deepgram
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIM=3072

# Frontend
VITE_API_URL=http://localhost:8000
VITE_LIVEKIT_URL=ws://localhost:7880
```

---

## Architecture Decisions

| Decision | Rationale | Revisit If |
|---|---|---|
| LiveKit over raw WebRTC | SFU scaling, Agents framework, token auth | Cost issue → self-host LiveKit |
| OpenAI Realtime for host | Native audio, interruption API, function calling | Latency >800ms → Ultravox/Moshi |
| Provider abstraction for TTS | Swap cost/quality tradeoff, local-first option | Only one provider ever needed |
| JSON mode for script generation | Reliable schema compliance, easy validation | Model drops support → regex fallback |
| Semantic chunking | Better RAG retrieval quality | Small docs (<5k words) → fixed-size fine |
| Push-to-talk by default | Privacy, battery, cleaner UX | User wants hands-free → VAD toggle |
| Celery for ingestion jobs | Decouple long-running work from request cycle | Scale issue → switch to Temporal |
