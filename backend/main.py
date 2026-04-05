from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import digest, auth

app = FastAPI(title="Postman API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(digest.router, prefix="/digest", tags=["digest"])


@app.get("/health")
async def health():
    return {"status": "ok"}
