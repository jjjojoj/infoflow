"""Async SQLAlchemy database engine and session factory.

Exposes ``engine``, ``AsyncSessionLocal`` and helper utilities to initialise
the schema and yield a session for FastAPI dependencies.
"""
from __future__ import annotations

import os
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""


# Ensure the data directory exists for SQLite file paths
def _ensure_sqlite_dir(url: str) -> None:
    if url.startswith("sqlite") and ":///" in url:
        path = url.split(":///", 1)[1]
        directory = os.path.dirname(path)
        if directory:
            os.makedirs(directory, exist_ok=True)


_ensure_sqlite_dir(settings.DATABASE_URL)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Create all tables on startup. Imports models for metadata side-effects."""
    from . import models  # noqa: F401  ensure models are registered

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency that yields an ``AsyncSession``."""
    async with AsyncSessionLocal() as session:
        yield session
