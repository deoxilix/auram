"""Live session lifecycle orchestration."""
from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import select

from app.core.config import settings
from app.core.database import async_session_factory
from app.core.logging import get_logger
from app.models.enums import InterruptionAction, PodcastStatus, SessionStatus
from app.models.podcast import PodcastScript
from app.models.session import ConversationTurn, InterruptionEvent, LiveSession
from app.services.session import livekit_ops

log = get_logger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def create_session(
    script_id: UUID, user_id: UUID | None = None
) -> tuple[LiveSession, str]:
    """Create a session: provision the room, dispatch the agent, mint a token.

    Returns (session, user_token).
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
            livekit_room_name="",  # set below using the row id
            status=SessionStatus.WAITING,
        )
        session.add(live)
        await session.commit()
        await session.refresh(live)

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
    return live, token


async def get_session(session_id: UUID) -> LiveSession | None:
    async with async_session_factory() as session:
        return await session.get(LiveSession, session_id)


async def issue_join_token(session_id: UUID, user_id: UUID | None = None) -> str:
    """Mint a fresh participant token for an existing session (reconnect/join)."""
    live = await get_session(session_id)
    if live is None:
        raise ValueError(f"Session not found: {session_id}")
    if live.status == SessionStatus.ENDED:
        raise ValueError("Session has ended")
    return livekit_ops.create_access_token(
        identity=f"user-{user_id or live.id}",
        name="You",
        room=live.livekit_room_name,
        attributes={"role": "user", "speaker_id": "user"},
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
