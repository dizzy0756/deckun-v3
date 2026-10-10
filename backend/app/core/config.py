from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///deckun.db"
    SECRET_KEY: str = "dev-secret-change-in-prod"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: list[str] = ["*"]

    model_config = {"env_file": ".env"}


settings = Settings()
