"""FastAPI application entry-point for InfoFlow.

Wires up CORS, routers, database initialisation and the background
scheduler lifecycle.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import articles, insights, obsidian, settings as settings_router, sources
from .services.scheduler import scheduler_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hooks: init DB and manage scheduler lifecycle."""
    logger.info("InfoFlow backend starting up...")
    await init_db()
    try:
        scheduler_service.start()
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Scheduler failed to start: %s", exc)
    yield
    logger.info("InfoFlow backend shutting down...")
    try:
        scheduler_service.shutdown()
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Scheduler failed to stop cleanly: %s", exc)


app = FastAPI(
    title="InfoFlow API",
    description="Personal information assistant backend.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"])
async def root() -> dict[str, str]:
    """Service root - returns a simple banner."""
    return {"service": "InfoFlow", "version": "0.1.0"}


@app.get("/api/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe endpoint."""
    return {"status": "ok"}


# Routers
app.include_router(articles.router)
app.include_router(sources.router)
app.include_router(insights.router)
app.include_router(settings_router.router)
app.include_router(obsidian.router)
