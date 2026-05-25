"""Huawei Ascend community scraper."""
from __future__ import annotations

import html
import logging
import re
from datetime import datetime
from typing import Any

import feedparser
import httpx

from .base import BaseScraper, RawArticle

logger = logging.getLogger(__name__)

# Huawei Ascend community endpoints
_COMMUNITY_URLS = [
    "https://www.hiascend.com/forum/list",
    "https://www.hiascend.com/developer/blog",
]

_RSS_CANDIDATES = [
    "https://www.hiascend.com/rss.xml",
    "https://www.hiascend.com/developer/blog/rss.xml",
    "https://www.hiascend.com/forum/rss.xml",
]


class HuaweiAscendScraper(BaseScraper):
    """Scrape https://www.hiascend.com/forum and related community pages."""

    name = "huawei_ascend"
    source_type = "crawler"

    def __init__(self) -> None:
        self._base_url = "https://www.hiascend.com"
        self._headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }

    async def fetch(self, **kwargs: Any) -> list[dict[str, Any]]:
        """Fetch latest content from Huawei Ascend community."""
        articles = await self._fetch_via_rss()
        if articles:
            return articles

        return await self._fetch_via_httpx()

    async def _fetch_via_rss(self) -> list[dict[str, Any]]:
        """Try likely RSS endpoints before falling back to static HTML."""
        all_articles: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            for url in _RSS_CANDIDATES:
                try:
                    resp = await client.get(url, headers=self._headers)
                    if resp.status_code != 200:
                        continue
                    all_articles.extend(self._parse_feed(resp.content))
                except Exception as e:
                    logger.debug("Huawei Ascend RSS candidate failed %s: %s", url, e)

        if all_articles:
            logger.info("Huawei Ascend RSS: found %d articles", len(all_articles))
        return all_articles

    async def _fetch_via_httpx(self) -> list[dict[str, Any]]:
        """Fallback: fetch community pages via httpx."""
        all_articles: list[dict[str, Any]] = []

        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                for url in _COMMUNITY_URLS:
                    try:
                        resp = await client.get(url, headers=self._headers)
                        if resp.status_code == 200:
                            parsed = self._parse_static_html(resp.text, url)
                            all_articles.extend(parsed)
                    except Exception as e:
                        logger.debug("httpx failed for %s: %s", url, e)
                        continue

        except Exception as e:
            logger.warning("Huawei Ascend httpx fallback failed: %s", e)

        logger.info("Huawei Ascend (httpx): found %d articles", len(all_articles))
        if not all_articles:
            logger.warning(
                "Huawei Ascend produced no articles; hiascend.com appears JS-rendered. "
                "Configure a working RSS URL as a source when available."
            )
        return all_articles

    def _parse_feed(self, raw_data: bytes | str) -> list[dict[str, Any]]:
        """Parse RSS/Atom data into article dicts."""
        feed = feedparser.parse(raw_data)
        articles: list[dict[str, Any]] = []

        for entry in feed.entries[:50]:
            try:
                title = (entry.get("title") or "").strip()
                link = entry.get("link", "")
                summary = entry.get("summary", "") or entry.get("description", "")
                if not title or not link:
                    continue
                if not self.matches_keywords(f"{title} {summary}"):
                    continue

                article = RawArticle(
                    title=f"【昇腾社区】{title}",
                    url=link,
                    content=summary,
                    source_name=self.name,
                    source_type=self.source_type,
                    tags=["ascend", "huawei"],
                    published_at=datetime.utcnow(),
                )
                articles.append(article.to_dict())
            except Exception as e:
                logger.debug("Error parsing Huawei Ascend feed entry: %s", e)
                continue

        return articles

    def _parse_static_html(self, raw_html: str, source_url: str) -> list[dict[str, Any]]:
        """Extract likely article links from static HTML."""
        articles: list[dict[str, Any]] = []
        seen: set[str] = set()
        for match in re.finditer(
            r"<a\b[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>",
            raw_html,
            flags=re.IGNORECASE | re.DOTALL,
        ):
            href = html.unescape(match.group(1)).strip()
            title = self._clean_html(match.group(2))
            if not title or len(title) < 4:
                continue
            if not self.matches_keywords(title):
                continue
            if href.startswith("/"):
                href = self._base_url + href
            elif not href.startswith("http"):
                href = self._base_url + "/" + href
            if href in seen:
                continue
            seen.add(href)
            articles.append(
                RawArticle(
                    title=f"【昇腾社区】{title}",
                    url=href,
                    content=f"Source page: {source_url}",
                    source_name=self.name,
                    source_type=self.source_type,
                    tags=["ascend", "huawei"],
                    published_at=datetime.utcnow(),
                ).to_dict()
            )
        return articles[:30]

    @staticmethod
    def _clean_html(value: str) -> str:
        value = re.sub(r"<[^>]+>", " ", value)
        value = html.unescape(value)
        return re.sub(r"\s+", " ", value).strip()

    async def parse(self, raw_data: Any) -> list[dict[str, Any]]:
        """Parse raw HTML data from Huawei Ascend community."""
        if isinstance(raw_data, (bytes, str)):
            feed_articles = self._parse_feed(raw_data)
            if feed_articles:
                return feed_articles
        if isinstance(raw_data, str):
            return self._parse_static_html(raw_data, self._base_url)
        return []
