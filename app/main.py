from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.init_db import init_db
from app.routers import audits

app = FastAPI(
    title="AI API Auditor",
    description="API para auditar endpoints y detectar problemas de diseño, seguridad y buenas prácticas.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # para desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


app.include_router(audits.router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-api-auditor",
    }