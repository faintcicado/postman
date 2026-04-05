from datetime import date

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from services.gmail import fetch_todays_emails, fetch_email_bodies
from services.claude import build_digest
from services.cache import get_cached_digest, set_cached_digest

router = APIRouter()


class DigestResponse(BaseModel):
    day_summary: str
    emails: list[dict]
    cached: bool = False


@router.post("/", response_model=DigestResponse)
async def create_digest(
    authorization: str = Header(..., description="Bearer <google_access_token>"),
    x_user_email: str = Header(..., alias="X-User-Email"),
):
    """Fetch today's unread emails and return an AI-generated digest."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Expected Bearer token")

    access_token = authorization.removeprefix("Bearer ")
    today = date.today().isoformat()

    cached = await get_cached_digest(x_user_email, today)
    if cached:
        return DigestResponse(**cached, cached=True)

    try:
        emails = fetch_todays_emails(access_token)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gmail fetch failed: {exc}")

    try:
        digest = build_digest(emails, lambda ids: fetch_email_bodies(access_token, ids))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Claude call failed: {exc}")

    await set_cached_digest(x_user_email, today, digest)

    return DigestResponse(**digest)
