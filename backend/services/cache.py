import hashlib
import json

import redis.asyncio as aioredis

from config import settings

_pool: aioredis.Redis | None = None

DIGEST_TTL = 60 * 60 * 6  # 6 hours


def _get_client() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _pool


def _digest_key(user_email: str, date_str: str) -> str:
    return f"digest:{user_email}:{date_str}"


def _emails_hash(emails: list[dict]) -> str:
    return hashlib.sha256(json.dumps(emails, sort_keys=True).encode()).hexdigest()[:16]


async def get_cached_digest(user_email: str, date_str: str) -> dict | None:
    client = _get_client()
    raw = await client.get(_digest_key(user_email, date_str))
    if raw:
        return json.loads(raw)
    return None


async def set_cached_digest(user_email: str, date_str: str, digest: dict) -> None:
    client = _get_client()
    await client.setex(_digest_key(user_email, date_str), DIGEST_TTL, json.dumps(digest))
