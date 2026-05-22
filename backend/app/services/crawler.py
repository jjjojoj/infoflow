"""High-level crawler orchestration service.

Coordinates per-source scrapers, persists results and triggers downstream
processing (deduplication, AI analysis, etc.).
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlalchemy import select, update

from ..database import AsyncSessionLocal
from ..models import Article, Source
from ..scrapers.arxiv import ArxivScraper
from ..scrapers.github_trending import GitHubTrendingScraper
from ..scrapers.huawei_ascend import HuaweiAscendScraper
from ..scrapers.zhihu import ZhihuScraper
from .dedup import content_hash, dedup_engine
from .rss_parser import rss_parser

logger = logging.getLogger(__name__)

# Mapping from source_type / name to scraper class
_SCRAPER_MAP: dict[str, Any] = {
    "github_trending": GitHubTrendingScraper,
    "arxiv": ArxivScraper,
    "zhihu": ZhihuScraper,
    "huawei_ascend": HuaweiAscendScraper,
}


class CrawlerService:
    """Orchestrates scrapers across enabled sources."""

    async def run_all(self) -> int:
        """Run every enabled scraper once. Returns the number of new items stored."""
        logger.info("CrawlerService: starting full crawl...")
        total_new = 0

        async with AsyncSessionLocal() as session:
            # Get all enabled sources
            stmt = select(Source).where(Source.enabled == True)  # noqa: E712
            result = await session.execute(stmt)
            sources = result.scalars().all()

            if not sources:
                # If no sources configured, run all built-in scrapers
                logger.info("No sources configured; running built-in scrapers...")
                total_new += await self._run_builtin_scrapers(session)
            else:
                for source in sources:
                    try:
                        new_count = await self._run_single_source(source, session)
                        total_new += new_count
                    except Exception as e:
                        logger.error("Error running source '%s': %s", source.name, e)
                        continue

        logger.info("CrawlerService: full crawl complete. %d new articles.", total_new)
        return total_new

    async def run_source(self, source_id: int) -> int:
        """Run a single source by id. Returns number of new items."""
        async with AsyncSessionLocal() as session:
            stmt = select(Source).where(Source.id == source_id)
            result = await session.execute(stmt)
            source = result.scalar_one_or_none()

            if not source:
                logger.warning("Source id=%d not found", source_id)
                return 0

            return await self._run_single_source(source, session)

    async def _run_single_source(self, source: Source, session: Any) -> int:
        """Execute a single source's scraper or RSS parser."""
        logger.info("Running source: %s (type=%s)", source.name, source.source_type)

        articles: list[dict[str, Any]] = []

        if source.source_type == "rss":
            articles = await rss_parser.parse(source.url)
        elif source.source_type == "crawler":
            scraper_cls = _SCRAPER_MAP.get(source.name)
            if scraper_cls:
                scraper = scraper_cls()
                articles = await scraper.fetch()
            else:
                logger.warning("No scraper registered for source name '%s'", source.name)
                return 0
        else:
            logger.warning("Unknown source_type '%s' for source '%s'", source.source_type, source.name)
            return 0

        # Deduplicate and store
        new_count = await self._store_articles(articles, session)

        # Update last_fetched timestamp
        await session.execute(
            update(Source)
            .where(Source.id == source.id)
            .values(last_fetched=datetime.utcnow())
        )
        await session.commit()

        logger.info("Source '%s': %d new articles stored", source.name, new_count)
        return new_count

    async def _run_builtin_scrapers(self, session: Any) -> int:
        """Run all built-in scrapers when no sources are configured."""
        total_new = 0

        for name, scraper_cls in _SCRAPER_MAP.items():
            try:
                scraper = scraper_cls()
                articles = await scraper.fetch()
                new_count = await self._store_articles(articles, session)
                total_new += new_count
                logger.info("Built-in scraper '%s': %d new articles", name, new_count)
            except Exception as e:
                logger.error("Built-in scraper '%s' failed: %s", name, e)
                continue

        return total_new

    async def _store_articles(self, articles: list[dict[str, Any]], session: Any) -> int:
        """Deduplicate and store articles into the database.

        Returns the number of newly inserted articles.
        """
        new_count = 0

        for article_data in articles:
            try:
                # Run dedup check
                is_dup = await dedup_engine.is_duplicate(article_data, session)
                if is_dup:
                    continue

                # Compute content hash
                hash_value = content_hash(article_data.get("content", ""))

                # Create Article ORM object
                article = Article(
                    title=article_data.get("title", ""),
                    url=article_data.get("url", ""),
                    content=article_data.get("content", ""),
                    source_name=article_data.get("source_name", ""),
                    source_type=article_data.get("source_type", ""),
                    tags=article_data.get("tags", []),
                    content_hash=hash_value,
                    is_read=False,
                    is_bookmarked=False,
                    relevance_score=0.0,
                )

                session.add(article)
                new_count += 1

            except Exception as e:
                logger.debug("Error storing article: %s", e)
                continue

        if new_count > 0:
            try:
                await session.commit()
            except Exception as e:
                logger.error("Failed to commit articles: %s", e)
                await session.rollback()
                new_count = 0

        return new_count


crawler_service = CrawlerService()
