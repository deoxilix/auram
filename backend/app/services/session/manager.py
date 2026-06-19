"""Live session lifecycle orchestration."""
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import select

from app.core.config import settings
from app.core.database import async_session_factory
from app.core.logging import get_logger
from app.models.enums import InterruptionAction, PodcastStatus, SessionStatus
from app.models.podcast import PodcastScript, ScriptSegment
from app.models.session import ConversationTurn, InterruptionEvent, LiveSession
from app.services.session import livekit_ops, vapi_ops

log = get_logger(__name__)


@dataclass
class SessionConnection:
    """Provider-specific connection details handed to the client on create/join."""

    audio_provider: str
    # LiveKit
    token: str | None = None
    ws_url: str | None = None
    # VAPI
    vapi_public_key: str | None = None
    vapi_assistant_id: str | None = None
    script_context: str | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def create_session(
    script_id: UUID, user_id: UUID | None = None
) -> tuple[LiveSession, SessionConnection]:
    """Create a session and return provider-specific connection details.

    LiveKit: provisions a room, dispatches the agent, mints a join token.
    VAPI: records the session and builds the script system-prompt for the client.
    """
    async with async_session_factory() as session:
        script = await session.get(PodcastScript, script_id)
        if script is None:
            raise ValueError(f"Podcast not found: {script_id}")
        if script.status != PodcastStatus.READY:
            raise ValueError(f"Podcast not ready (status={script.status})")

        live = LiveSession(
            script_id=script_id,
            user_id=user_id,
            livekit_room_name="",  # set below for LiveKit; left blank for VAPI
            status=SessionStatus.WAITING,
        )
        session.add(live)
        await session.commit()
        await session.refresh(live)

        if settings.audio_provider == "vapi":
            stmt = (
                select(ScriptSegment)
                .where(ScriptSegment.script_id == script_id)
                .order_by(ScriptSegment.sequence)
            )
            segments = list((await session.exec(stmt)).all())
            conn = _vapi_connection(script, segments)
            log.info("session_created", session_id=str(live.id), provider="vapi")
            return live, conn

        # LiveKit path: name the room after the row id.
        room_name = f"podcast-{live.id}"
        live.livekit_room_name = room_name
        session.add(live)
        await session.commit()
        await session.refresh(live)

    metadata = {
        "script_id": str(script_id),
        "session_id": str(live.id),
        "current_segment": 0,
    }
    await livekit_ops.create_room(room_name, metadata)
    await livekit_ops.dispatch_host_agent(room_name, metadata)

    user_identity = f"user-{user_id or live.id}"
    token = livekit_ops.create_access_token(
        identity=user_identity,
        name="You",
        room=room_name,
        attributes={"role": "user", "speaker_id": "user"},
    )
    log.info("session_created", session_id=str(live.id), room=room_name)
    return live, SessionConnection(
        audio_provider="livekit", token=token, ws_url=settings.livekit_ws_url
    )


def _vapi_connection(
    script: PodcastScript, segments: list[ScriptSegment]
) -> SessionConnection:
    return SessionConnection(
        audio_provider="vapi",
        vapi_public_key=settings.vapi_public_key,
        vapi_assistant_id=settings.vapi_assistant_id,
        # The {{script}} template variable for the dashboard assistant.
        script_context=vapi_ops.build_script_text(script, segments),
    )


async def get_session(session_id: UUID) -> LiveSession | None:
    async with async_session_factory() as session:
        return await session.get(LiveSession, session_id)


async def rejoin_session(
    session_id: UUID, user_id: UUID | None = None
) -> SessionConnection:
    """Rebuild connection details for an existing session (reconnect/late join)."""
    async with async_session_factory() as session:
        live = await session.get(LiveSession, session_id)
        if live is None:
            raise ValueError(f"Session not found: {session_id}")
        if live.status == SessionStatus.ENDED:
            raise ValueError("Session has ended")

        if settings.audio_provider == "vapi":
            script = await session.get(PodcastScript, live.script_id)
            stmt = (
                select(ScriptSegment)
                .where(ScriptSegment.script_id == live.script_id)
                .order_by(ScriptSegment.sequence)
            )
            segments = list((await session.exec(stmt)).all())
            return _vapi_connection(script, segments)

        room_name = live.livekit_room_name

    token = livekit_ops.create_access_token(
        identity=f"user-{user_id or session_id}",
        name="You",
        room=room_name,
        attributes={"role": "user", "speaker_id": "user"},
    )
    return SessionConnection(
        audio_provider="livekit", token=token, ws_url=settings.livekit_ws_url
    )


async def update_progress(session_id: UUID, segment_index: int) -> None:
    async with async_session_factory() as session:
        live = await session.get(LiveSession, session_id)
        if live is None:
            return
        live.current_segment_index = segment_index
        if live.status == SessionStatus.WAITING:
            live.status = SessionStatus.LIVE
            live.started_at = _now()
        session.add(live)
        await session.commit()


async def end_session(session_id: UUID) -> None:
    async with async_session_factory() as session:
        live = await session.get(LiveSession, session_id)
        if live is None:
            return
        live.status = SessionStatus.ENDED
        live.ended_at = _now()
        session.add(live)
        await session.commit()
        room_name = live.livekit_room_name
    if not room_name:
        return  # VAPI session: nothing to tear down server-side.
    try:
        await livekit_ops.delete_room(room_name)
    except Exception as exc:  # noqa: BLE001 — room may already be gone
        log.warning("room_delete_failed", room=room_name, error=str(exc))


async def add_turn(
    session_id: UUID,
    *,
    speaker_id: str,
    text: str,
    segment_index: int = 0,
    is_interruption: bool = False,
    interruption_target: str | None = None,
) -> None:
    async with async_session_factory() as session:
        session.add(
            ConversationTurn(
                session_id=session_id,
                speaker_id=speaker_id,
                text=text,
                segment_index=segment_index,
                is_interruption=is_interruption,
                interruption_target=interruption_target,
            )
        )
        await session.commit()


async def record_interruption(
    session_id: UUID,
    *,
    user_text: str,
    host_response: str = "",
    action: InterruptionAction = InterruptionAction.ACKNOWLEDGE,
    resolved: bool = False,
) -> None:
    async with async_session_factory() as session:
        session.add(
            InterruptionEvent(
                session_id=session_id,
                user_text=user_text,
                host_response=host_response,
                action_taken=action,
                resolved=resolved,
            )
        )
        await session.commit()


async def get_history(session_id: UUID) -> list[ConversationTurn]:
    async with async_session_factory() as session:
        stmt = (
            select(ConversationTurn)
            .where(ConversationTurn.session_id == session_id)
            .order_by(ConversationTurn.timestamp)
        )
        return list((await session.exec(stmt)).all())


def ws_url() -> str:
    return settings.livekit_ws_url
