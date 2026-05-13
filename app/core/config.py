from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    PROJECT_NAME: str = "AI API Auditor"
    VERSION: str = "1.0.0"
    DATABASE_URL: str = "sqlite:///./ai_api_auditor.db"
    # In production this must come from .env (or a secret manager), never from fallback.
    SECRET_KEY: str = "change-me-in-production"
    TOKEN_ISSUER: str = "ai-api-auditor"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    MAX_OPENAPI_SIZE_CHARS: int = 200000
    MAX_REQUEST_BODY_SIZE_CHARS: int = 250000
    MAX_OPENAPI_ENDPOINTS: int = 50
    MAX_OPENAPI_OPERATIONS_PER_PATH: int = 5
    RATE_LIMIT_LOGIN_REQUESTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 60
    RATE_LIMIT_AI_REQUESTS: int = 10
    RATE_LIMIT_AI_WINDOW_SECONDS: int = 300

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
