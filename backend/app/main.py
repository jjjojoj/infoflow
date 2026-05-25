"""FastAPI application entry-point for InfoFlow.

Wires up CORS, routers, database initialisation and the background
scheduler lifecycle.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .config import settings
from .database import AsyncSessionLocal, init_db
from .models import Source
from .routers import articles, insights, obsidian, settings as settings_router, sources, stats
from .services.scheduler import scheduler_service

logger = logging.getLogger(__name__)

NEW_RSS_SOURCES = [
    {"name": "量子位", "url": "https://www.qbitai.com/feed", "category": "AI新闻"},
    {"name": "机器之心", "url": "https://www.jiqizhixin.com/rss", "category": "AI新闻"},
    {"name": "HuggingFace Blog", "url": "https://huggingface.co/blog/feed.xml", "category": "AI技术"},
    {"name": "Papers with Code", "url": "https://paperswithcode.com/rss", "category": "论文"},
    {"name": "OpenAI Blog", "url": "https://openai.com/blog/rss.xml", "category": "AI技术"},
    {"name": "DeepSeek", "url": "https://api-deepseek-docs.synology.me/rss.xml", "category": "AI技术"},
    {"name": "IT之家 AI", "url": "https://www.ithome.com/rss/118-11.xml", "category": "科技新闻"},
    {"name": "36氪 AI", "url": "https://36kr.com/feed", "category": "科技新闻"},
]


async def ensure_default_rss_sources() -> None:
    """Insert recommended RSS sources if they are not already configured."""
    async with AsyncSessionLocal() as session:
        created = 0
        for item in NEW_RSS_SOURCES:
            result = await session.execute(select(Source).where(Source.name == item["name"]))
            if result.scalar_one_or_none():
                continue
            session.add(
                Source(
                    name=item["name"],
                    url=item["url"],
                    source_type="rss",
                    enabled=True,
                    fetch_interval=settings.FETCH_INTERVAL_MINUTES,
                    config={"category": item["category"]},
                )
            )
            created += 1
        if created:
            await session.commit()
            logger.info("Registered %d default RSS sources", created)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hooks: init DB and manage scheduler lifecycle."""
    logger.info("InfoFlow backend starting up...")
    await init_db()
    await ensure_default_rss_sources()
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
app.include_router(stats.router)
