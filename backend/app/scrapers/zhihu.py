"""Zhihu scraper - hot column / topic articles."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

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
        self._search_url = "https://www.zhihu.com/api/v4/search_v3"
        self._hot_url = "https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total"
        self._headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://www.zhihu.com/",
        }

    async def fetch(self, **kwargs: Any) -> list[dict[str, Any]]:
        """Fetch Zhihu content related to target keywords.

        Attempts StealthyFetcher first, falls back to httpx search API.
        """
        articles = await self._fetch_via_stealthy()
        if articles:
            return articles

        # Fallback: use httpx to call Zhihu search API
        return await self._fetch_via_httpx()

    async def _fetch_via_stealthy(self) -> list[dict[str, Any]]:
        """Try fetching Zhihu hot list using StealthyFetcher."""
        try:
            from scrapling import StealthyFetcher

            fetcher = StealthyFetcher()
            all_articles: list[dict[str, Any]] = []

            for keyword in _SEARCH_KEYWORDS[:3]:  # Limit to avoid rate limiting
                try:
                    url = f"https://www.zhihu.com/search?type=content&q={keyword}"
                    response = fetcher.get(url)
                    if response and response.status == 200:
                        parsed = self._parse_search_html(response.text, keyword)
                        all_articles.extend(parsed)
                except Exception as e:
                    logger.debug("StealthyFetcher failed for keyword '%s': %s", keyword, e)
                    continue

            if all_articles:
                logger.info("Zhihu (StealthyFetcher): found %d articles", len(all_articles))
            return all_articles

        except ImportError:
            logger.info("StealthyFetcher not available, using httpx fallback")
            return []
        except Exception as e:
            logger.warning("StealthyFetcher error: %s", e)
            return []

    def _parse_search_html(self, html: str, keyword: str) -> list[dict[str, Any]]:
        """Parse Zhihu search results HTML page."""
        try:
            from selectolax.parser import HTMLParser
        except ImportError:
            return []

        tree = HTMLParser(html)
        articles: list[dict[str, Any]] = []

        # Try to find search result cards
        for card in tree.css(".SearchResult-Card, .ContentItem"):
            try:
                title_el = card.css_first("h2, .ContentItem-title a")
                if not title_el:
                    continue
                title = title_el.text(strip=True)
                if not title:
                    continue

                # Get link
                link_el = card.css_first("a[href*='/question/'], a[href*='/p/']")
                if link_el:
                    href = link_el.attributes.get("href", "")
                    if href.startswith("//"):
                        href = "https:" + href
                    elif not href.startswith("http"):
                        href = "https://www.zhihu.com" + href
                else:
                    href = f"https://www.zhihu.com/search?type=content&q={keyword}"

                # Get summary
                summary_el = card.css_first(".RichContent-inner, .content")
                summary = summary_el.text(strip=True)[:200] if summary_el else ""

                article = RawArticle(
                    title=f"[知乎] {title}",
                    url=href,
                    content=summary,
                    source_name=self.name,
                    source_type=self.source_type,
                    tags=["zhihu", keyword],
                    published_at=datetime.utcnow(),
                )
                articles.append(article.to_dict())

            except Exception as e:
                logger.debug("Error parsing Zhihu card: %s", e)
                continue

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
        if isinstance(raw_data, str):
            return self._parse_search_html(raw_data, "")
        return []
