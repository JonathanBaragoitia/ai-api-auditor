from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_db import init_db
from app.routers import audits, auth


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="AI API Auditor",
    description="API para auditar endpoints y detectar problemas de diseño, seguridad y buenas prácticas.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audits.router)
app.include_router(auth.router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-api-auditor",
    }
