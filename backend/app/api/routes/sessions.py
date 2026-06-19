"""Live session REST endpoints."""
from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.models.session import LiveSession
from app.models.schemas import (
    CreateSessionRequest,
    SessionResponse,
    TurnResponse,
)
from app.services.session import manager

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _to_response(live: LiveSession, *, token: str | None = None) -> SessionResponse:
    return SessionResponse(
        id=live.id,
        script_id=live.script_id,
        room_name=live.livekit_room_name,
        status=live.status,
        current_segment_index=live.current_segment_index,
        ws_url=manager.ws_url() if token else None,
        token=token,
    )


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(req: CreateSessionRequest) -> SessionResponse:
    """Create a live session: provisions a room + agent and returns a token."""
    try:
        live, token = await manager.create_session(req.podcast_id)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — surface LiveKit connectivity issues
        raise HTTPException(502, f"LiveKit error: {exc}") from exc
    return _to_response(live, token=token)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: UUID) -> SessionResponse:
    live = await manager.get_session(session_id)
    if live is None:
        raise HTTPException(404, "Session not found")
    return _to_response(live)


@router.post("/{session_id}/join", response_model=SessionResponse)
async def join_session(session_id: UUID) -> SessionResponse:
    """Issue a fresh participant token (reconnect or late join)."""
    live = await manager.get_session(session_id)
    if live is None:
        raise HTTPException(404, "Session not found")
    try:
        token = await manager.issue_join_token(session_id)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    return _to_response(live, token=token)


@router.post("/{session_id}/leave", status_code=204)
async def leave_session(session_id: UUID) -> None:
    await manager.end_session(session_id)


@router.get("/{session_id}/history", response_model=list[TurnResponse])
async def get_history(session_id: UUID) -> list[TurnResponse]:
    turns = await manager.get_history(session_id)
    return [
        TurnResponse(
            id=t.id,
            speaker_id=t.speaker_id,
            text=t.text,
            segment_index=t.segment_index,
            is_interruption=t.is_interruption,
            timestamp=t.timestamp,
        )
        for t in turns
    ]
