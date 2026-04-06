import base64
from datetime import date, datetime, timezone

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

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


def _format_date(internal_date_ms: str) -> str:
    dt = datetime.fromtimestamp(int(internal_date_ms) / 1000, tz=timezone.utc).astimezone()
    return dt.strftime("%m/%d %H:%M")


def fetch_todays_emails(access_token: str) -> list[dict]:
    """Return metadata-only dicts (no body) for all of today's unread emails."""
    service = _build_service(access_token)
    today = date.today().strftime("%Y/%m/%d")
    query = f"after:{today} is:unread"

    all_messages = []
    page_token = None
    while True:
        kwargs = {"userId": "me", "q": query}
        if page_token:
            kwargs["pageToken"] = page_token
        result = service.users().messages().list(**kwargs).execute()
        all_messages.extend(result.get("messages", []))
        page_token = result.get("nextPageToken")
        if not page_token:
            break

    emails = []
    for msg in all_messages:
        full = service.users().messages().get(
            userId="me", id=msg["id"], format="full"
        ).execute()

        headers = {h["name"]: h["value"] for h in full["payload"]["headers"]}
        emails.append({
            "id": full["id"],
            "subject": headers.get("Subject", "(no subject)"),
            "from": headers.get("From", ""),
            "date": _format_date(full.get("internalDate", "0")),
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
