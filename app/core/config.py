from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI API Auditor"
    VERSION: str = "1.0.0"
    DATABASE_URL: str = "sqlite:///./ai_api_auditor.db"
    # In production this must come from .env (or a secret manager), never from fallback.
    SECRET_KEY: str = "dev-only-change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
