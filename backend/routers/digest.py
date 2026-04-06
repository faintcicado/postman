from datetime import date

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy import select

from database import AsyncSessionLocal
from models.digest import DigestRecord
from services.gmail import fetch_todays_emails, fetch_email_bodies
from services.claude import build_digest
from services.cache import get_cached_digest, set_cached_digest

router = APIRouter()


class DigestResponse(BaseModel):
    day_summary: str
    emails: list[dict]
    cached: bool = False


class HistoryEntry(BaseModel):
    date: str
    day_summary: str
    emails: list[dict]


@router.post("/", response_model=DigestResponse)
async def create_digest(
    authorization: str = Header(..., description="Bearer <google_access_token>"),
    x_user_email: str = Header(..., alias="X-User-Email"),
):
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
        if "insufficientPermissions" in str(exc) or "insufficient authentication scopes" in str(exc).lower():
            raise HTTPException(status_code=403, detail="GMAIL_SCOPE_MISSING")
        raise HTTPException(status_code=502, detail=f"Gmail fetch failed: {exc}")

    try:
        digest = build_digest(emails, lambda ids: fetch_email_bodies(access_token, ids))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Claude call failed: {exc}")

    date_map = {e["id"]: e["date"] for e in emails}
    for item in digest.get("emails", []):
        item["date"] = date_map.get(item["id"], "")

    await set_cached_digest(x_user_email, today, digest)
    await _save_digest(x_user_email, digest)

    return DigestResponse(**digest)


@router.get("/history", response_model=list[HistoryEntry])
async def get_history(x_user_email: str = Header(..., alias="X-User-Email")):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(DigestRecord)
            .where(DigestRecord.user_email == x_user_email)
            .order_by(DigestRecord.digest_date.desc())
            .limit(30)
        )
        records = result.scalars().all()

    return [
        HistoryEntry(
            date=r.digest_date.isoformat(),
            day_summary=r.payload.get("day_summary", ""),
            emails=r.payload.get("emails", []),
        )
        for r in records
    ]


async def _save_digest(user_email: str, digest: dict) -> None:
    today = date.today()
    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            select(DigestRecord).where(
                DigestRecord.user_email == user_email,
                DigestRecord.digest_date == today,
            )
        )
        if existing.scalar_one_or_none():
            return
        db.add(DigestRecord(user_email=user_email, digest_date=today, payload=digest))
        await db.commit()
