"""High-level crawler orchestration service.

Coordinates per-source scrapers, persists results and triggers downstream
processing (deduplication, AI analysis, etc.).
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime
from typing import Any

from sqlalchemy import select, update

from ..database import AsyncSessionLocal
from ..models import Article, Interest, Source
from ..scrapers.arxiv import ArxivScraper
from ..scrapers.base import KEYWORDS
from ..scrapers.github_trending import GitHubTrendingScraper
from ..scrapers.huawei_ascend import HuaweiAscendScraper
from ..scrapers.zhihu import ZhihuScraper
from .dedup import content_hash, dedup_engine
from .rss_parser import rss_parser

logger = logging.getLogger(__name__)

SOURCE_TIMEOUT_SECONDS = 120
SOURCE_DISPLAY_NAMES = {
    "arxiv": "arXiv 论文",
    "github_trending": "GitHub 热门",
    "zhihu": "知乎",
    "huawei_ascend": "昇腾社区",
}

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
                    # Cache name before any commit that could expire the object
                    src_name = source.name
                    try:
                        new_count = await asyncio.wait_for(
                            self._run_single_source(source, session),
                            timeout=SOURCE_TIMEOUT_SECONDS,
                        )
                        total_new += new_count
                    except asyncio.TimeoutError:
                        await session.rollback()
                        logger.error(
                            "Source '%s' timed out after %d seconds",
                            src_name,
                            SOURCE_TIMEOUT_SECONDS,
                        )
                    except Exception as e:
                        logger.exception("Error running source '%s': %s", src_name, e)
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

            try:
                return await asyncio.wait_for(
                    self._run_single_source(source, session),
                    timeout=SOURCE_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                await session.rollback()
                logger.error(
                    "Source id=%d timed out after %d seconds",
                    source_id,
                    SOURCE_TIMEOUT_SECONDS,
                )
                return 0

    async def _run_single_source(self, source: Source, session: Any) -> int:
        """Execute a single source's scraper or RSS parser."""
        # Cache attributes before any commit can expire the ORM object
        source_id = source.id
        source_name = source.name
        source_type = source.source_type
        source_url = source.url

        logger.info("Running source: %s (type=%s)", source_name, source_type)

        articles: list[dict[str, Any]] = []

        if source_type == "rss":
            articles = await rss_parser.parse(source_url)
            for article in articles:
                article["source_name"] = source_name
        elif source_type == "crawler":
            scraper_cls = _SCRAPER_MAP.get(source_name)
            if scraper_cls:
                scraper = scraper_cls()
                articles = await scraper.fetch()
            else:
                logger.warning("No scraper registered for source name '%s'", source_name)
                return 0
        else:
            logger.warning("Unknown source_type '%s' for source '%s'", source_type, source_name)
            return 0

        # Deduplicate and store
        new_count = await self._store_articles(articles, session)

        # Update last_fetched timestamp using cached id
        await session.execute(
            update(Source)
            .where(Source.id == source_id)
            .values(last_fetched=datetime.utcnow())
        )
        await session.commit()

        logger.info("Source '%s': %d new articles stored", source_name, new_count)
        return new_count

    async def _run_builtin_scrapers(self, session: Any) -> int:
        """Run all built-in scrapers when no sources are configured."""
        total_new = 0

        for name, scraper_cls in _SCRAPER_MAP.items():
            try:
                scraper = scraper_cls()
                articles = await asyncio.wait_for(
                    scraper.fetch(),
                    timeout=SOURCE_TIMEOUT_SECONDS,
                )
                new_count = await self._store_articles(articles, session)
                total_new += new_count
                logger.info("Built-in scraper '%s': %d new articles", name, new_count)
            except asyncio.TimeoutError:
                await session.rollback()
                logger.error(
                    "Built-in scraper '%s' timed out after %d seconds",
                    name,
                    SOURCE_TIMEOUT_SECONDS,
                )
            except Exception as e:
                logger.exception("Built-in scraper '%s' failed: %s", name, e)
                continue

        return total_new

    async def _store_articles(self, articles: list[dict[str, Any]], session: Any) -> int:
        """Deduplicate and store articles into the database.

        Returns the number of newly inserted articles.
        """
        new_count = 0
        interest_result = await session.execute(
            select(Interest).where(Interest.enabled == True)  # noqa: E712
        )
        interests = interest_result.scalars().all()

        for article_data in articles:
            try:
                raw_title = article_data.get("title", "") or ""
                raw_content = article_data.get("content", "") or ""
                filter_text = f"{raw_title} {raw_content}"
                if not any(kw.lower() in filter_text.lower() for kw in KEYWORDS):
                    continue

                # Run dedup check
                is_dup = await dedup_engine.is_duplicate(article_data, session)
                if is_dup:
                    continue

                source_name = article_data.get("source_name", "") or ""
                title = await self._translate_title(raw_title, raw_content, source_name)
                content = raw_content
                if title != raw_title:
                    content = f"Original title: {raw_title}\n\n{raw_content}".strip()

                relevance_score = self._compute_relevance_score(title, content, interests)

                # Compute content hash
                hash_value = content_hash(content)

                # Create Article ORM object
                article = Article(
                    title=title[:512],
                    url=article_data.get("url", ""),
                    content=content,
                    summary=article_data.get("summary") or "",
                    source_name=source_name,
                    source_type=article_data.get("source_type", ""),
                    tags=article_data.get("tags", []),
                    content_hash=hash_value,
                    is_read=False,
                    is_bookmarked=False,
                    relevance_score=relevance_score,
                )

                session.add(article)
                new_count += 1

            except Exception as e:
                logger.exception("Error storing article: %s", e)
                continue

        if new_count > 0:
            try:
                await session.commit()
            except Exception as e:
                logger.error("Failed to commit articles: %s", e)
                await session.rollback()
                new_count = 0

        # Generate AI summaries for articles without one
        if new_count > 0:
            await self._generate_missing_summaries(session)

        return new_count

    async def _translate_title(self, title: str, content_hint: str, source_name: str) -> str:
        """Translate predominantly English titles into Chinese for display."""
        if not title or not self._is_predominantly_english(title):
            return title

        display_name = SOURCE_DISPLAY_NAMES.get(source_name, source_name)
        clean_title = re.sub(r"^\[[^\]]+\]\s*", "", title).strip()

        try:
            from .ai_analyzer import ai_analyzer

            messages = [
                {
                    "role": "system",
                    "content": "你是技术文章标题翻译助手。只返回简洁、准确的中文标题。",
                },
                {
                    "role": "user",
                    "content": (
                        "请将下面的英文技术标题翻译成中文，保留必要英文术语，不要解释。\n"
                        f"标题：{clean_title}\n"
                        f"内容线索：{content_hint[:500]}"
                    ),
                },
            ]
            resp = await asyncio.wait_for(
                ai_analyzer.llm.chat(messages, temperature=0.2, max_tokens=120),
                timeout=20,
            )
            translated = resp.content.strip().strip('"').strip("'")
            translated = re.sub(r"^【[^】]+】\s*", "", translated).strip()
            if translated:
                return f"【{display_name}】{translated}"
        except Exception as e:
            logger.warning("Title translation failed for '%s': %s", title[:80], e)

        return f"【{display_name}】{clean_title}"

    @staticmethod
    def _is_predominantly_english(title: str) -> bool:
        """Return True when ASCII letters dominate the title."""
        return len(re.findall(r"[a-zA-Z]", title)) > len(title) * 0.5

    @staticmethod
    def _compute_relevance_score(title: str, content: str, interests: list[Interest]) -> float:
        """Compute a capped interest-keyword relevance score."""
        score = 0.0
        text = f"{title} {content}".lower()
        for interest in interests:
            keyword = (interest.keyword or "").lower()
            if keyword and keyword in text:
                score += interest.weight
        return min(score, 1.0)

    async def _generate_missing_summaries(self, session: Any) -> None:
        """Call LLM to generate summaries for articles that lack one."""
        from .ai_analyzer import ai_analyzer

        stmt = select(Article).where(
            (Article.summary == None) | (Article.summary == "")  # noqa: E711
        ).order_by(Article.id.desc()).limit(20)
        result = await session.execute(stmt)
        articles = result.scalars().all()

        if not articles:
            return

        logger.info("Generating AI summaries for %d articles", len(articles))
        for article in articles:
            try:
                text = f"标题：{article.title}\n\n内容：{(article.content or '')[:2000]}"
                summary = await asyncio.wait_for(
                    ai_analyzer.generate_summary(text),
                    timeout=30,
                )
                if summary:
                    article.summary = summary
                    await session.commit()
                    logger.info("Generated summary for article id=%d", article.id)
            except asyncio.TimeoutError:
                logger.warning("Summary generation timed out for article id=%d", article.id)
                await session.rollback()
            except Exception as e:
                logger.warning("Summary generation failed for article id=%d: %s", article.id, e)
                await session.rollback()


crawler_service = CrawlerService()
