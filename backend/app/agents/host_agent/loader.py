"""Load a SessionState from persisted script + session data."""
from uuid import UUID

from sqlmodel import select

from app.core.database import async_session_factory
from app.agents.host_agent.state import SegmentView, SessionState
from app.models.podcast import PodcastScript, ScriptSegment


async def load_state(session_id: UUID, script_id: UUID) -> SessionState:
    async with async_session_factory() as session:
        script = await session.get(PodcastScript, script_id)
        if script is None:
            raise ValueError(f"Script not found: {script_id}")
        stmt = (
            select(ScriptSegment)
            .where(ScriptSegment.script_id == script_id)
            .order_by(ScriptSegment.sequence)
        )
        segments = list((await session.exec(stmt)).all())

    return SessionState(
        session_id=session_id,
        script_id=script_id,
        document_id=script.document_id,
        title=script.title,
        overview=script.overview,
        segments=[
            SegmentView(
                speaker_id=s.speaker_id,
                text=s.text,
                segment_type=s.segment_type,
                sequence=s.sequence,
            )
            for s in segments
        ],
        speakers={s["id"]: s for s in script.speakers},
    )
