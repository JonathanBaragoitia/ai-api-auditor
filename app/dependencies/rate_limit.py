import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.models.user import User


# Rate limiter en memoria: suficiente para desarrollo/demo.
# En producción multi-instancia debería moverse a Redis u otro storage compartido.
_requests: dict[str, Deque[float]] = defaultdict(deque)


def clear_rate_limits() -> None:
    _requests.clear()


def check_rate_limit(
    request: Request,
    scope: str,
    limit: int,
    window_seconds: int,
    user: User | None = None,
) -> None:
    now = time.monotonic()

    for key in _rate_limit_keys(request, scope, user):
        bucket = _requests[key]

        while bucket and now - bucket[0] >= window_seconds:
            bucket.popleft()

        if len(bucket) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.",
            )

    for key in _rate_limit_keys(request, scope, user):
        _requests[key].append(now)


def rate_limit_login(request: Request) -> None:
    check_rate_limit(
        request=request,
        scope="auth:login",
        limit=settings.RATE_LIMIT_LOGIN_REQUESTS,
        window_seconds=settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
    )


def rate_limit_ai_audit(request: Request, user: User) -> None:
    check_rate_limit(
        request=request,
        scope="audits:ai",
        limit=settings.RATE_LIMIT_AI_REQUESTS,
        window_seconds=settings.RATE_LIMIT_AI_WINDOW_SECONDS,
        user=user,
    )


def _rate_limit_keys(request: Request, scope: str, user: User | None) -> list[str]:
    client_host = request.client.host if request.client else "unknown"
    keys = [f"{scope}:ip:{client_host}"]

    if user is not None:
        keys.append(f"{scope}:user:{user.id}")

    return keys
