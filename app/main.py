from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

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
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if request.url.path.startswith(("/auth", "/audits")):
            response.headers.setdefault("Cache-Control", "no-store")
        return response


app.add_middleware(SecurityHeadersMiddleware)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Rechazo temprano por Content-Length para no parsear cuerpos enormes antes de validar OpenAPI.
        content_length = request.headers.get("content-length")
        try:
            request_size = int(content_length) if content_length else 0
        except ValueError:
            request_size = 0
        if request_size > settings.MAX_REQUEST_BODY_SIZE_CHARS:
            return JSONResponse(
                status_code=413,
                content={"detail": "La solicitud supera el tamaño máximo permitido."},
            )
        return await call_next(request)


app.add_middleware(RequestSizeLimitMiddleware)

app.include_router(audits.router)
app.include_router(auth.router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-api-auditor",
    }
