"""Huawei Ascend community scraper."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import httpx

from .base import BaseScraper, RawArticle

logger = logging.getLogger(__name__)

# Huawei Ascend community endpoints
_COMMUNITY_URLS = [
    "https://www.hiascend.com/forum/list",
    "https://www.hiascend.com/developer/blog",
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
        """Fetch latest content from Huawei Ascend community.

        Attempts StealthyFetcher first, falls back to httpx.
        """
        articles = await self._fetch_via_stealthy()
        if articles:
            return articles

        return await self._fetch_via_httpx()

    async def _fetch_via_stealthy(self) -> list[dict[str, Any]]:
        """Try fetching using StealthyFetcher for JavaScript-rendered pages."""
        try:
            from scrapling import StealthyFetcher

            fetcher = StealthyFetcher()
            all_articles: list[dict[str, Any]] = []

            for url in _COMMUNITY_URLS:
                try:
                    response = fetcher.get(url)
                    if response and response.status == 200:
                        parsed = self._parse_community_html(response.text, url)
                        all_articles.extend(parsed)
                except Exception as e:
                    logger.debug("StealthyFetcher failed for %s: %s", url, e)
                    continue

            if all_articles:
                logger.info("Huawei Ascend (StealthyFetcher): found %d articles", len(all_articles))
            return all_articles

        except ImportError:
            logger.info("StealthyFetcher not available for Huawei Ascend, using httpx fallback")
            return []
        except Exception as e:
            logger.warning("StealthyFetcher error for Huawei Ascend: %s", e)
            return []

    async def _fetch_via_httpx(self) -> list[dict[str, Any]]:
        """Fallback: fetch community pages via httpx."""
        all_articles: list[dict[str, Any]] = []

        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                for url in _COMMUNITY_URLS:
                    try:
                        resp = await client.get(url, headers=self._headers)
                        if resp.status_code == 200:
                            parsed = self._parse_community_html(resp.text, url)
                            all_articles.extend(parsed)
                    except Exception as e:
                        logger.debug("httpx failed for %s: %s", url, e)
                        continue

        except Exception as e:
            logger.warning("Huawei Ascend httpx fallback failed: %s", e)

        logger.info("Huawei Ascend (httpx): found %d articles", len(all_articles))
        return all_articles

    def _parse_community_html(self, html: str, source_url: str) -> list[dict[str, Any]]:
        """Parse Huawei Ascend community HTML pages."""
        try:
            from selectolax.parser import HTMLParser
        except ImportError:
            logger.warning("selectolax not available, cannot parse Huawei Ascend pages")
            return []

        tree = HTMLParser(html)
        articles: list[dict[str, Any]] = []

        # Try common selectors for forum/blog posts
        selectors = [
            ".post-item", ".blog-item", ".forum-item",
            ".list-item", "article", ".card",
            "[class*='post']", "[class*='article']", "[class*='blog']",
        ]

        found_items = []
        for selector in selectors:
            items = tree.css(selector)
            if items:
                found_items = items
                break

        for item in found_items[:30]:  # Limit to 30 items
            try:
                # Try to find title
                title_el = (
                    item.css_first("h2 a, h3 a, .title a, .post-title, a.title")
                    or item.css_first("h2, h3, .title")
                )
                if not title_el:
                    continue
                title = title_el.text(strip=True)
                if not title or len(title) < 4:
                    continue

                # Try to find link
                link_el = item.css_first("a[href]")
                if link_el:
                    href = link_el.attributes.get("href", "")
                    if href.startswith("/"):
                        href = self._base_url + href
                    elif not href.startswith("http"):
                        href = self._base_url + "/" + href
                else:
                    href = source_url

                # Try to find summary/description
                summary_el = item.css_first(
                    ".summary, .description, .excerpt, p, .content"
                )
                summary = summary_el.text(strip=True)[:300] if summary_el else ""

                # Try to find date
                date_el = item.css_first(
                    ".date, .time, time, [class*='date'], [class*='time']"
                )
                published_at = None
                if date_el:
                    date_text = date_el.text(strip=True) or date_el.attributes.get("datetime", "")
                    if date_text:
                        try:
                            published_at = datetime.fromisoformat(date_text.replace("Z", "+00:00"))
                        except ValueError:
                            published_at = datetime.utcnow()
                    else:
                        published_at = datetime.utcnow()
                else:
                    published_at = datetime.utcnow()

                article = RawArticle(
                    title=f"[昇腾社区] {title}",
                    url=href,
                    content=summary,
                    source_name=self.name,
                    source_type=self.source_type,
                    tags=["ascend", "huawei"],
                    published_at=published_at,
                )
                articles.append(article.to_dict())

            except Exception as e:
                logger.debug("Error parsing Huawei Ascend item: %s", e)
                continue

        return articles

    async def parse(self, raw_data: Any) -> list[dict[str, Any]]:
        """Parse raw HTML data from Huawei Ascend community."""
        if isinstance(raw_data, str):
            return self._parse_community_html(raw_data, self._base_url)
        return []
