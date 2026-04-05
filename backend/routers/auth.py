from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

router = APIRouter()


class TokenExchangeRequest(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expires_at: int | None = None


class TokenExchangeResponse(BaseModel):
    valid: bool
    email: str | None = None


@router.post("/verify", response_model=TokenExchangeResponse)
async def verify_token(body: TokenExchangeRequest):
    """Verify a Google OAuth access token passed from the Next.js frontend."""
    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/tokeninfo",
            params={"access_token": body.access_token},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")

    data = resp.json()
    return TokenExchangeResponse(valid=True, email=data.get("email"))
