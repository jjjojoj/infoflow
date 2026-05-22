"""Application configuration loaded from environment variables.

Uses pydantic-settings to validate and expose runtime configuration such as
LLM provider keys, database URL, scheduler interval and Obsidian vault path.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from .env / environment variables."""

    # LLM
    LLM_PROVIDER: Literal["deepseek", "openai", "ollama"] = "deepseek"
    DEEPSEEK_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b"

    # Scheduler
    FETCH_INTERVAL_MINUTES: int = 30

    # Obsidian
    OBSIDIAN_VAULT_PATH: str = "./data/obsidian_vault"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/infoflow.db"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()
