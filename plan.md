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

- [x] Project scaffold: FastAPI + SQLModel + Alembic migrations + Celery
- [x] Docker Compose: `postgres`, `redis`, `qdrant` services
- [x] **Ingestion Service** (`services/ingestion/`)
  - URL extractor via `trafilatura`
  - PDF extractor via `PyMuPDF`
  - Plain text input
  - Content cleaner (strip nav, ads, fix encoding)
  - Semantic chunker via LlamaIndex
  - Batch embedder via OpenAI `text-embedding-3-large`
  - Store document + chunks to Postgres + Qdrant
  - REST: `POST /api/v1/documents`, `GET /api/v1/documents/{id}`
- [x] **Script Generator** (`services/script_generator/`)
  - Build prompt from document content + `ScriptParams`
  - Call GPT-4o in JSON mode, parse into `PodcastScript` schema
  - Validate output (completeness, duration estimates)
  - Assign speaker profiles and voice IDs
  - REST: `POST /api/v1/podcasts/generate`, `GET /api/v1/podcasts/{id}`
- [x] **TTS Pipeline** (`services/tts/`)
  - Provider abstraction protocol (`TTSProvider`)
  - OpenAI TTS provider (primary)
  - Batch synthesize all script segments → store audio per segment
  - Cache synthesized audio on disk (content-addressed)
  - REST: `GET /api/v1/podcasts/{id}/audio`

### Frontend

- [x] Project scaffold: Vite + React 18 + TypeScript + Tailwind
- [x] **Upload Page** — drag-drop PDF/URL/text, progress indicator (ingestion status polling)
- [x] **Library Page** — podcast cards with metadata, play/delete actions
- [x] **Audio Player** — segmented playback of pre-generated podcast, transcript panel
- [x] API client (TanStack Query) wired to all backend endpoints

### Infrastructure

- [x] `.env.example` with all required variables
- [ ] GitHub Actions CI: lint, typecheck, pytest
- [ ] Staging deploy

**Exit criteria**: User can upload a blog URL, get a generated 10-minute two-speaker podcast, and listen to it.

---

## Phase 2 — Live Sessions (Weeks 4–6) — ✅ IMPLEMENTED

**Goal**: Real-time conversational podcast via WebRTC. User can interrupt and ask questions.

> Status: Session Manager (LiveKit rooms, tokens, lifecycle), Host Agent
> (OpenAI Realtime via LiveKit Agents 1.x with function tools + state machine),
> and the frontend Session page (visualizer, live transcript, push-to-talk
> interrupt, progress) are built. Running live sessions requires a LiveKit
> server and an OpenAI key with Realtime access. The host agent runs as a
> separate worker: `python -m app.agents.host_agent.agent dev`.

### Backend

- [x] **Session Manager** (`services/session/`)
  - Create LiveKit room, issue host + user tokens
  - Track session state: current segment index, history
  - Handle reconnection (resume at correct segment)
  - Session cleanup on end
  - REST: `POST /api/v1/sessions`, `POST /api/v1/sessions/{id}/join`
- [x] **Host Agent** (`agents/host_agent/`)
  - `HostAgent(Agent)` using LiveKit Agents 1.x + OpenAI Realtime (`gpt-realtime`)
  - System prompt injection: script overview, current segment, upcoming topics
  - Function tools:
    - `get_current_segment()` → returns text for current position
    - `advance_segment()` → moves to next segment
    - `answer_question(question)` → RAG-backed answer from source doc
    - `defer_question(topic)` → marks for later, continues script
  - State machine: `WAITING → INTRO → TOPIC_SEGMENTS → ENDED`
  - Kicks off intro via `session.generate_reply()` on connect
  - ~~`get_conversation_summary()`~~ — not implemented
  - ~~Turn-taking guest speaker~~ — single host voice only
- [ ] WebSocket / LiveKit data channel events for control messages

### Frontend

- [x] **Session Page** (`pages/SessionPage.tsx`)
  - `AudioVisualizer` — animated waveform per speaker
  - `TranscriptPanel` — real-time scrolling transcript with speaker labels
  - `SegmentProgress` — visual progress through podcast topics
  - `InterruptionButton` — push-to-talk "Interrupt / Ask" button
  - `TopicSidebar` — upcoming topics, deferred questions list
  - Leave session control
  - Session creation via cached `useQuery` (survives React StrictMode double-mount)
- [x] **LiveKit integration hooks**
  - `useVoiceAssistant()` — agent audio state from `@livekit/components-react`
  - `useTranscriptions` (`hooks/useTranscriptions.ts`) — real-time STT transcript
  - Push-to-talk via `InterruptionButton` + `useLocalParticipant`
  - ~~`useLiveKitRoom()` / `useDataChannel()`~~ — not needed with Agents SDK
- [ ] `SpeakerAvatar` — animated speaking indicator per participant
- [ ] Auto-reconnect on network drop

**Exit criteria**: User clicks "Go Live", joins a WebRTC room, listens to the AI host and guest work through the script, and can press interrupt to ask a question mid-conversation.

---

## Phase 2b — VAPI Audio Integration (Hackathon branch: `vapi-swap-integration`)

**Goal**: Swap the LiveKit + OpenAI Realtime audio layer for VAPI, keeping both paths swappable via a single env var. The ingestion, script generation, TTS, and database layers are untouched.

### What VAPI replaces

| Removed (LiveKit path) | Replaced by (VAPI path) |
|---|---|
| LiveKit SFU server | VAPI cloud (handles WebRTC) |
| Python host agent worker | VAPI assistant (configured on dashboard) |
| OpenAI Realtime API | VAPI's built-in LLM/TTS |
| `@livekit/components-react` | `@vapi-ai/web` SDK |

No LiveKit server or Python agent worker is needed in the VAPI path.

### New env vars

```bash
# Audio provider: livekit (default) | vapi
AUDIO_PROVIDER=vapi

# VAPI credentials
VAPI_PUBLIC_KEY=...          # browser-safe public key from VAPI dashboard
VAPI_ASSISTANT_ID=...        # assistant created on VAPI dashboard
```

### Backend changes

- [x] `backend/app/core/config.py` — added `audio_provider`, `vapi_public_key`, `vapi_assistant_id` fields
- [x] New `backend/app/services/session/vapi_ops.py`
  - `build_script_context(script, segments)` → formats host guidance + segments into a system prompt string
  - ~~`create_vapi_call()`~~ — not needed; the browser SDK starts the call directly with overrides
- [x] `backend/app/services/session/manager.py` — branch in `create_session()` + `rejoin_session()`:
  - `AUDIO_PROVIDER=livekit` → existing path (room + agent dispatch + LiveKit token)
  - `AUDIO_PROVIDER=vapi` → skip room/agent, write DB record, return script context + VAPI credentials
  - returns a `SessionConnection` dataclass carrying provider-specific fields; `end_session` skips room teardown for VAPI
- [x] `backend/app/models/schemas.py` — extended `SessionResponse` with `audio_provider`, `vapi_public_key`, `vapi_assistant_id`, `script_context` (all nullable alongside `token`/`ws_url`)
- [x] `backend/app/api/routes/sessions.py` — `_to_response` maps the `SessionConnection` onto the response

### Frontend changes

- [x] Install `@vapi-ai/web` (v2.5.2)
- [x] New `frontend/src/hooks/useVapi.ts`
  - Wraps VAPI SDK: `start()`, `stop()`, `setMuted()` (push-to-talk)
  - Exposes: `isConnected`, `isSpeaking`, `volume`, `lines: TranscriptLine[]`, `error`
  - Maps VAPI events (`call-start`, `speech-start/end`, `volume-level`, `message`, `error`) to app state
- [x] New `frontend/src/components/session/VapiSessionRoom.tsx`
  - Replaces `SessionRoom.tsx` for the VAPI path
  - Uses `useVapi`; auto-starts the call, mutes mic for push-to-talk
  - Passes `script_context` as `assistantOverrides.model.messages[system]` on call start
  - Volume-driven visualizer; reuses `TranscriptView`, `SegmentProgress`, `TopicSidebar`
- [x] Extracted `TranscriptView.tsx` (presentational) so both providers share the transcript UI
- [x] New `frontend/src/hooks/useEstimatedProgress.ts` — derives an approximate segment index + smooth fraction from elapsed call time vs each segment's `estimated_duration_sec` (since VAPI gives no server-side cursor)
- [x] `SegmentProgress.tsx` — optional `fraction` prop for a smooth time-based fill
- [x] `frontend/src/pages/SessionPage.tsx` — branches on `session.audio_provider`:
  - `livekit` → existing `<LiveKitRoom>` + `<SessionRoom>` render
  - `vapi` → `<VapiSessionRoom>` render (no LiveKitRoom wrapper)
- [x] No frontend env needed — provider + VAPI public key arrive in the session response from the backend

### Prompt strategy (final — template variables)

The teammate built the **"Aarum Host (Alex)"** assistant (ID `780b0004-1948-461f-8a0d-e04340a34ea7`, voice Vapi Elliot) on the dashboard with its own persona and two runtime template variables: `{{topic}}` and `{{script}}`. So we use **variable injection**, not a system-prompt override:

- Backend `vapi_ops.build_script_text(script, segments)` → renders the `{{script}}` value (overview + segments only, no persona — the dashboard owns that)
- Frontend passes `variableValues: { topic: podcast.title, script: session.script_context }` as the 2nd arg to `vapi.start(assistantId, ...)`
- Note: the web SDK's 2nd arg **is** the `AssistantOverrides` object directly — `variableValues` sits at its top level, *not* wrapped in `{ assistantOverrides: {...} }` (that nesting is the server REST API shape)

> **Note:** The VAPI path estimates progress from elapsed time (the conversation
> runs entirely in VAPI's cloud, so there's no real server-side script cursor).
> The bar fills smoothly and "Coming up" advances approximately. Exact per-segment
> tracking would require VAPI server-side function tools / webhooks (future work).

### Script context injection

When starting a VAPI call, pass the podcast script as an assistant override so the VAPI assistant knows what to cover:

```typescript
vapi.start(assistantId, {
  firstMessage: "Welcome! Let's dive into today's podcast.",
  model: {
    systemPrompt: session.script_context,  // built server-side from segments
  },
});
```

`build_script_context()` formats it as:

```
You are hosting a podcast on: <title>
Overview: <overview>

Script segments (cover them in order):
[1] (intro) <text>
[2] (topic) <text>
...
After each segment, transition naturally to the next.
The listener may interrupt at any time to ask questions — answer from the script context, then resume.
```

### What stays the same

- All ingestion, script generation, TTS endpoints and services
- Database models (LiveSession still records the session; `livekit_room_name` is left blank for VAPI sessions)
- Library, Upload, and Player pages
- All 17 existing tests

### Swappability

Set `AUDIO_PROVIDER=livekit` (and run LiveKit server + agent worker) to use the full LiveKit path. Set `AUDIO_PROVIDER=vapi` (and set VAPI keys) to use VAPI — no other services needed. Both paths coexist in the same codebase on the `vapi-swap-integration` branch.

**Exit criteria**: User uploads content, generates a script, clicks "Go Live", and has a real-time voice conversation with the VAPI assistant that follows the podcast script.

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
