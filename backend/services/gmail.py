import base64
from datetime import date

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

MAX_EMAILS = 20
BODY_CHAR_LIMIT = 1500


def _build_service(access_token: str):
    creds = Credentials(token=access_token)
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def _decode_body(payload: dict) -> str:
    parts = payload.get("parts", [])
    if parts:
        for part in parts:
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data", "")
                if data:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
        return ""
    data = payload.get("body", {}).get("data", "")
    if data:
        return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
    return ""


def fetch_todays_emails(access_token: str) -> list[dict]:
    """Return metadata-only dicts (no body) for today's unread emails."""
    service = _build_service(access_token)
    today = date.today().strftime("%Y/%m/%d")
    query = f"after:{today} is:unread"

    result = service.users().messages().list(userId="me", q=query, maxResults=MAX_EMAILS).execute()
    messages = result.get("messages", [])

    emails = []
    for msg in messages:
        full = service.users().messages().get(
            userId="me", id=msg["id"], format="full"
        ).execute()

        headers = {h["name"]: h["value"] for h in full["payload"]["headers"]}
        emails.append({
            "id": full["id"],
            "subject": headers.get("Subject", "(no subject)"),
            "from": headers.get("From", ""),
            "snippet": full.get("snippet", ""),
        })

    return emails


def fetch_email_bodies(access_token: str, email_ids: list[str]) -> dict[str, str]:
    """Fetch full bodies for a specific set of email IDs. Returns {id: body}."""
    if not email_ids:
        return {}

    service = _build_service(access_token)
    bodies = {}
    for email_id in email_ids:
        full = service.users().messages().get(
            userId="me", id=email_id, format="full"
        ).execute()
        bodies[email_id] = _decode_body(full["payload"])[:BODY_CHAR_LIMIT]

    return bodies
