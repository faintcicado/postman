import json

import anthropic

from config import settings

_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

TRIAGE_PROMPT = """
You are an email triage assistant. Below is a list of today's unread emails — subject, sender, and a short snippet only.

Identify which emails you need the full body to accurately triage (e.g. to find deadlines, understand action items, or assess true priority). For emails where the snippet is enough, do not request the body.

Reply with ONLY a JSON array of the email IDs you want the full body for. No explanation.
Example: ["id1", "id3"]
If you need none, reply: []

Emails:
{emails_json}
"""

DIGEST_PROMPT = """
You are an email triage assistant. Produce a prioritized digest from today's unread emails.

You have metadata (subject, sender, snippet) for all emails. For some, you also have the full body.

For each email return an item in the "emails" array:
{{
  "id": "<email_id>",
  "priority": "action_required" | "fyi" | "low",
  "summary": "<one sentence: what does this email say or want?>",
  "action": "<what the user should do, or null>",
  "deadline": "<extracted deadline/date string, or null>"
}}

Also include:
"day_summary": "<one sentence: the single most important thing today>"

Return only valid JSON:
{{
  "day_summary": "...",
  "emails": [...]
}}

No explanation outside the JSON block.

Email metadata (all):
{metadata_json}

Full bodies (requested emails only):
{bodies_json}
"""


def _parse_json(raw: str) -> object:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def build_digest(emails: list[dict], fetch_bodies_fn) -> dict:
    """
    Two-turn Claude call:
      Turn 1 — send metadata only, ask which IDs need full body.
      Turn 2 — send those bodies, get final structured digest.
    fetch_bodies_fn: callable(ids: list[str]) -> dict[str, str]
    """
    if not emails:
        return {"day_summary": "No unread emails today.", "emails": []}

    # --- Turn 1: triage pass ---
    triage_prompt = TRIAGE_PROMPT.format(emails_json=json.dumps(emails, indent=2))
    turn1 = _client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{"role": "user", "content": triage_prompt}],
    )
    requested_ids: list[str] = _parse_json(turn1.content[0].text)

    # --- Fetch bodies only for emails Claude asked for ---
    bodies = fetch_bodies_fn(requested_ids)

    # --- Turn 2: digest pass ---
    digest_prompt = DIGEST_PROMPT.format(
        metadata_json=json.dumps(emails, indent=2),
        bodies_json=json.dumps(bodies, indent=2),
    )
    turn2 = _client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": digest_prompt}],
    )

    return _parse_json(turn2.content[0].text)
