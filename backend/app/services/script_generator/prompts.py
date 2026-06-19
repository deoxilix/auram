"""Prompt construction for podcast script generation."""
from app.models.schemas import ScriptParams

SYSTEM_PROMPT = """You are an expert podcast script writer. You convert source \
material into a natural, engaging two-host conversational podcast.

Speakers:
- HOST (speaker_id "host"): curious, guides the conversation, asks questions
- GUEST (speaker_id "guest"): knowledgeable expert, explains and elaborates

Requirements:
- Natural dialogue: interruptions, agreements ("that's fascinating", "wait, really?"),
  callbacks to earlier points, smooth transitions
- Structure: an intro segment, 3-5 topic segments, a Q&A-style deep-dive, an outro
- Each segment is ONE speaker turn. Alternate speakers naturally.
- Insert "hooks" — natural moments where a listener could jump in with a question
- segment_type must be one of: intro, topic, transition, qa, outro
- Ground everything in the provided source material; do not invent facts

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "overview": "2-3 sentence summary",
  "segments": [
    {
      "speaker_id": "host" | "guest",
      "text": "what they say",
      "segment_type": "intro" | "topic" | "transition" | "qa" | "outro",
      "topic_tags": ["tag1", "tag2"],
      "cues": {"pause_after": 0.5}
    }
  ]
}"""


def build_user_prompt(content: str, params: ScriptParams) -> str:
    # Cap source length to stay within context; first N chars cover most articles.
    excerpt = content[:24000]
    return f"""Convert the following source material into a {params.target_minutes}-minute \
{params.tone.value} two-host podcast script.

Tone: {params.tone.value}
Host personality: {params.host_personality}
Guest personality: {params.guest_personality}
Include listener-question hooks: {params.include_hooks}

Target roughly {params.target_minutes * 150} words of dialogue total.

SOURCE MATERIAL:
\"\"\"
{excerpt}
\"\"\"

Return ONLY the JSON object described in the system prompt."""
