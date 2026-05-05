from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI API Auditor"
    VERSION: str = "1.0.0"
    DATABASE_URL: str = "sqlite:///./ai_api_auditor.db"

    class Config:
        env_file = ".env"


settings = Settings()