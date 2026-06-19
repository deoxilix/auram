"""Realtime host agent: drives the podcast and handles interruptions.

Run as a LiveKit Agents worker:
    python -m app.agents.host_agent.agent dev
"""
import json

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RunContext,
    WorkerOptions,
    cli,
    function_tool,
)
from livekit.plugins import openai

from app.agents.host_agent.loader import load_state
from app.agents.host_agent.prompts import HOST_INSTRUCTIONS, build_context_block
from app.agents.host_agent.state import Phase, SessionState
from app.core.config import settings
from app.core.logging import get_logger
from app.models.enums import InterruptionAction
from app.services.rag.query import retrieve_context
from app.services.session import manager
from app.services.session.livekit_ops import HOST_AGENT_NAME

log = get_logger(__name__)


class HostAgent(Agent):
    def __init__(self, state: SessionState) -> None:
        super().__init__(
            instructions=HOST_INSTRUCTIONS + "\n" + build_context_block(state)
        )
        self.state = state

    @function_tool
    async def get_current_segment(self, _ctx: RunContext) -> str:
        """Return the script text you should cover right now, with progress info."""
        seg = self.state.current()
        if seg is None:
            return "The script is complete. Give a brief outro and wrap up."
        return (
            f"Segment {self.state.index + 1}/{len(self.state.segments)} "
            f"(type={seg.segment_type}): {seg.text}\n"
            f"Upcoming: {'; '.join(self.state.upcoming_topics()) or '(end)'}"
        )

    @function_tool
    async def advance_segment(self, _ctx: RunContext) -> str:
        """Move to the next script segment once you finish the current one."""
        nxt = self.state.advance()
        await manager.update_progress(self.state.session_id, self.state.index)
        if nxt is None:
            self.state.phase = Phase.ENDED
            return "End of script. Give a short outro, then thank the listener."
        return f"Now on segment {self.state.index + 1}: {nxt.text}"

    @function_tool
    async def answer_question(self, _ctx: RunContext, question: str) -> str:
        """Get grounded context from the source document to answer a question."""
        context = await retrieve_context(question, self.state.document_id, k=5)
        await manager.record_interruption(
            self.state.session_id,
            user_text=question,
            action=InterruptionAction.ANSWER,
            resolved=True,
        )
        if not context:
            return "No specific passage found; answer briefly from general knowledge."
        return f"Use this source context to answer concisely:\n{context}"

    @function_tool
    async def defer_question(self, _ctx: RunContext, topic: str) -> str:
        """Note a question to revisit later, then steer back to the current topic."""
        self.state.deferred_questions.append(topic)
        await manager.record_interruption(
            self.state.session_id,
            user_text=topic,
            action=InterruptionAction.DEFER,
            resolved=False,
        )
        return f"Noted '{topic}' for later. Acknowledge briefly and continue."


def _parse_metadata(ctx: JobContext) -> dict:
    """Read session metadata from the agent dispatch or room metadata."""
    raw = ""
    if ctx.job and ctx.job.metadata:
        raw = ctx.job.metadata
    elif ctx.room and ctx.room.metadata:
        raw = ctx.room.metadata
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        return {}


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    meta = _parse_metadata(ctx)
    from uuid import UUID

    state = await load_state(UUID(meta["session_id"]), UUID(meta["script_id"]))
    log.info("host_agent_starting", session_id=meta["session_id"],
             segments=len(state.segments))

    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            model=settings.realtime_model,
            voice=settings.realtime_voice,
            api_key=settings.openai_api_key,
        ),
    )

    # Best-effort transcript logging of completed turns.
    @session.on("conversation_item_added")
    def _on_item(ev) -> None:  # noqa: ANN001 — event type is plugin-internal
        try:
            item = ev.item
            role = getattr(item, "role", "")
            text = getattr(item, "text_content", None) or ""
            if not text:
                return
            speaker = "user" if role == "user" else "host"
            import asyncio

            asyncio.create_task(
                manager.add_turn(
                    state.session_id,
                    speaker_id=speaker,
                    text=text,
                    segment_index=state.index,
                    is_interruption=(speaker == "user"),
                )
            )
        except Exception:  # noqa: BLE001 — never let logging break the session
            pass

    await session.start(agent=HostAgent(state), room=ctx.room)
    await manager.update_progress(state.session_id, 0)

    # Kick off the intro.
    await session.generate_reply(
        instructions="Warmly welcome the listener and begin the intro segment."
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name=HOST_AGENT_NAME,
            ws_url=settings.livekit_ws_url,
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret,
        )
    )
