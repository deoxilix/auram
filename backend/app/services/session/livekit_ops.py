"""Thin wrappers over the LiveKit server API: rooms, tokens, agent dispatch."""
import json
from datetime import timedelta

from livekit import api

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

HOST_AGENT_NAME = "host-agent"


def _client() -> api.LiveKitAPI:
    # Derive the HTTP API URL from the ws URL the agent/clients use.
    http_url = settings.livekit_ws_url.replace("ws://", "http://").replace(
        "wss://", "https://"
    )
    return api.LiveKitAPI(
        url=http_url,
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret,
    )


def create_access_token(
    *, identity: str, name: str, room: str, attributes: dict[str, str] | None = None
) -> str:
    """Mint a join token for a participant (the human user)."""
    token = (
        api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(identity)
        .with_name(name)
        .with_ttl(timedelta(hours=2))
        .with_grants(
            api.VideoGrants(room_join=True, room=room, can_publish=True,
                            can_subscribe=True)
        )
    )
    if attributes:
        token = token.with_attributes(attributes)
    return token.to_jwt()


async def create_room(name: str, metadata: dict) -> None:
    lkapi = _client()
    try:
        await lkapi.room.create_room(
            api.CreateRoomRequest(name=name, metadata=json.dumps(metadata))
        )
        log.info("livekit_room_created", room=name)
    finally:
        await lkapi.aclose()


async def dispatch_host_agent(room: str, metadata: dict) -> None:
    """Explicitly dispatch the host agent worker into a room."""
    lkapi = _client()
    try:
        await lkapi.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name=HOST_AGENT_NAME,
                room=room,
                metadata=json.dumps(metadata),
            )
        )
        log.info("host_agent_dispatched", room=room)
    finally:
        await lkapi.aclose()


async def delete_room(name: str) -> None:
    lkapi = _client()
    try:
        await lkapi.room.delete_room(api.DeleteRoomRequest(room=name))
        log.info("livekit_room_deleted", room=name)
    finally:
        await lkapi.aclose()
