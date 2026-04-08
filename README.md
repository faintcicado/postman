# Postman — AI Email Digest

An AI-powered email triage app that connects to your Gmail inbox and uses Claude to produce a prioritized daily digest — surfacing what needs attention before you open a single email.

**Live demo:** [postman-hazel.vercel.app](https://postman-hazel.vercel.app)

## Architecture

```
┌─────────────┐     Google OAuth2      ┌──────────────────┐
│  Next.js UI │ ──────────────────────▶│  Google Gmail API│
│  (Vercel)   │                        └──────────────────┘
└──────┬──────┘                                  │
       │ REST                                    │ fetch emails
       ▼                                         ▼
┌─────────────────┐   prompt + emails   ┌──────────────────┐
│  FastAPI Backend│ ──────────────────▶ │   Claude API     │
│  (Railway)      │ ◀────────────────── │  (Anthropic)     │
└──────┬──────────┘   structured digest └──────────────────┘
       │
       ├──▶ PostgreSQL  (digest history, user preferences)
       └──▶ Redis       (email fetch cache, rate limiting)
```

## Tech Stack

| Layer    | Choice                        |
|----------|-------------------------------|
| Frontend | Next.js 14 + Tailwind CSS     |
| Backend  | FastAPI (Python)              |
| AI       | Claude API (`claude-haiku-4-5`) |
| Email    | Gmail API via OAuth2          |
| Auth     | NextAuth.js + Google OAuth    |
| Database | PostgreSQL                    |
| Cache    | Redis                         |
| Deploy   | Vercel (frontend) + Railway (backend, DB, cache) |

## How It Works

Postman uses a **two-turn Claude prompt pipeline** to minimize API cost:

1. **Triage pass** — sends only subject, sender, and snippet for all emails. Claude responds with the IDs of emails it needs the full body to properly assess.
2. **Digest pass** — fetches bodies only for those specific emails, then Claude returns a structured JSON digest with priority, summary, action item, and deadline per email.

This means low-priority emails (newsletters, notifications) never incur body-fetch cost.

## Structured Output

Claude returns deterministic JSON on every call:

```json
{
  "day_summary": "You have a contract to sign by EOD and an interview scheduled tomorrow.",
  "emails": [
    {
      "id": "18f3a...",
      "priority": "action_required",
      "summary": "DocuSign contract requires your signature by 5pm today.",
      "action": "Open DocuSign and sign the contract",
      "deadline": "Today 5:00 PM"
    }
  ]
}
```

Emails are grouped in the UI by priority: **Action Required → FYI → Low**.

## Local Setup

### Prerequisites
- Python 3.11+ (via conda)
- Node.js 18+
- PostgreSQL
- Redis

### Backend

```bash
conda create -n postman python=3.11
conda activate postman
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your credentials
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in your credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

### `backend/.env`

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

### `frontend/.env.local`

| Variable | Description |
|---|---|
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your frontend URL |
| `GOOGLE_CLIENT_ID` | Same Google OAuth client as backend |
| `GOOGLE_CLIENT_SECRET` | Same Google OAuth client as backend |
| `NEXT_PUBLIC_API_URL` | Your FastAPI backend URL |

Google OAuth setup: enable the Gmail API and add `https://www.googleapis.com/auth/gmail.readonly` scope in [Google Cloud Console](https://console.cloud.google.com).

## Project Structure

```
postman/
├── backend/
│   ├── main.py               # FastAPI app + CORS middleware
│   ├── config.py             # Pydantic settings (reads from env)
│   ├── database.py           # Async SQLAlchemy setup
│   ├── routers/
│   │   ├── digest.py         # POST /digest, GET /digest/history
│   │   └── auth.py           # Token verification helpers
│   ├── services/
│   │   ├── gmail.py          # Gmail API client
│   │   ├── claude.py         # Two-turn Claude prompt pipeline
│   │   └── cache.py          # Redis helpers
│   ├── models/
│   │   └── digest.py         # SQLAlchemy models
│   ├── Procfile              # Railway start command
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx           # Digest dashboard (main view)
    │   ├── history/page.tsx   # Past digests from PostgreSQL
    │   ├── archived/page.tsx  # Locally archived emails
    │   ├── layout.tsx
    │   ├── providers.tsx      # NextAuth SessionProvider
    │   └── api/auth/          # NextAuth Google OAuth route
    ├── components/
    │   ├── DaySummary.tsx     # Hero summary banner
    │   ├── PriorityGroup.tsx  # Grouped email list
    │   └── DigestCard.tsx     # Per-email card
    ├── lib/
    │   └── archive.ts         # LocalStorage archive helpers
    └── package.json
```
