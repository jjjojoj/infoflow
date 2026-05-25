"""Zhihu scraper - hot column / topic articles."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import feedparser
import httpx

from .base import BaseScraper, RawArticle

logger = logging.getLogger(__name__)

# Keywords to search on Zhihu
_SEARCH_KEYWORDS = ["昇腾", "鲲鹏", "OCR", "信创", "CANN", "MindSpore", "文字识别"]


class ZhihuScraper(BaseScraper):
    """Scrape selected Zhihu columns/topics via search API or hot list."""

    name = "zhihu"
    source_type = "crawler"

    def __init__(self) -> None:
        self._rss_url = "https://www.zhihu.com/rss"
        self._hot_url = "https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total"
        self._headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://www.zhihu.com/",
        }

    async def fetch(self, **kwargs: Any) -> list[dict[str, Any]]:
        """Fetch Zhihu content related to target keywords via public endpoints."""
        articles = await self._fetch_via_rss()
        if articles:
            return articles

        return await self._fetch_via_httpx()

    async def _fetch_via_rss(self) -> list[dict[str, Any]]:
        """Fetch Zhihu's public RSS feed and filter it locally."""
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                resp = await client.get(self._rss_url, headers=self._headers)
                resp.raise_for_status()
            return self._parse_feed(resp.content)
        except Exception as e:
            logger.warning("Zhihu RSS fetch failed: %s", e)
            return []

    def _parse_feed(self, raw_data: bytes | str) -> list[dict[str, Any]]:
        """Parse RSS/Atom data into article dicts."""
        feed = feedparser.parse(raw_data)
        articles: list[dict[str, Any]] = []

        for entry in feed.entries[:50]:
            try:
                title = (entry.get("title") or "").strip()
                if not title:
                    continue
                summary = entry.get("summary", "") or entry.get("description", "")
                combined = f"{title} {summary}"
                if not self.matches_keywords(combined, _SEARCH_KEYWORDS):
                    continue
                href = entry.get("link", "")
                if not href:
                    continue

                article = RawArticle(
                    title=f"【知乎】{title}",
                    url=href,
                    content=summary,
                    source_name=self.name,
                    source_type=self.source_type,
                    tags=["zhihu"],
                    published_at=datetime.utcnow(),
                )
                articles.append(article.to_dict())

            except Exception as e:
                logger.debug("Error parsing Zhihu RSS entry: %s", e)
                continue

        logger.info("Zhihu RSS: found %d articles", len(articles))
        return articles

    async def _fetch_via_httpx(self) -> list[dict[str, Any]]:
        """Fallback: fetch Zhihu hot list via httpx and filter by keywords."""
        all_articles: list[dict[str, Any]] = []

        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                # Try fetching the hot list API
                resp = await client.get(
                    self._hot_url,
                    headers=self._headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("data", [])
                    for item in items:
                        target = item.get("target", {})
                        title = target.get("title", "")
                        excerpt = target.get("excerpt", "")
                        combined = f"{title} {excerpt}"

                        # Filter by keywords
                        if not self.matches_keywords(combined):
                            continue

                        question_id = target.get("id", "")
                        url = f"https://www.zhihu.com/question/{question_id}" if question_id else ""
                        if not url:
                            continue

                        article = RawArticle(
                            title=f"[知乎热榜] {title}",
                            url=url,
                            content=excerpt,
                            source_name=self.name,
                            source_type=self.source_type,
                            tags=["zhihu", "hot"],
                            published_at=datetime.utcnow(),
                        )
                        all_articles.append(article.to_dict())

        except Exception as e:
            logger.warning("Zhihu httpx fallback failed: %s", e)

        logger.info("Zhihu (httpx): found %d articles", len(all_articles))
        return all_articles

    async def parse(self, raw_data: Any) -> list[dict[str, Any]]:
        """Parse raw Zhihu data."""
        if isinstance(raw_data, (str, bytes)):
            return self._parse_feed(raw_data)
        return []
