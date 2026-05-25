"""Multi-layer content fetching with automatic fallback.

Strategy:
  Layer 1 — feedparser  (fastest, for well-formed RSS/Atom feeds)
  Layer 2 — Scrapling Fetcher  (static HTTP + JS-like headers, anti-fingerprint)
  Layer 3 — Scrapling StealthyFetcher  (headless Chromium, solves Cloudflare etc.)
  All layers failed → log the failure reason, return empty list.

Each article dict carries a ``fetch_method`` field so the frontend can show
how the content was obtained instead of a raw "RSS" label.
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime
from functools import partial
from time import mktime
from typing import Any

import feedparser

logger = logging.getLogger(__name__)

# Human-readable fetch method labels (stored in DB, shown in frontend)
FETCH_RSS = "RSS订阅"
FETCH_HTTP = "网页抓取"
FETCH_STEALTH = "深度采集"
FETCH_FAILED = "采集失败"


class RSSParser:
    """Parse RSS/Atom feeds into normalized records with multi-layer fallback."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    async def parse(self, url: str) -> list[dict[str, Any]]:
        """Fetch content from *url* using cascading fallback layers.

        Returns a list of normalized article dicts, each with a
        ``fetch_method`` key indicating which layer succeeded.
        """
        # Layer 1: feedparser (handles RSS/Atom XML natively)
        articles = await self._try_feedparser(url)
        if articles is not None:
            return articles

        # Layer 2: Scrapling static fetcher (anti-fingerprint HTTP)
        articles = await self._try_scrapling_static(url)
        if articles is not None:
            return articles

        # Layer 3: Scrapling stealth fetcher (headless Chromium)
        articles = await self._try_scrapling_stealthy(url)
        if articles is not None:
            return articles

        # All layers failed
        logger.error("所有采集方案均失败: %s", url)
        return []

    # ------------------------------------------------------------------
    # Layer 1 — feedparser
    # ------------------------------------------------------------------
    async def _try_feedparser(self, url: str) -> list[dict[str, Any]] | None:
        """Return articles list on success, or None to signal 'try next layer'."""
        try:
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(None, partial(feedparser.parse, url))
        except Exception as e:
            logger.warning("[Layer 1 feedparser] 请求异常 %s: %s", url, e)
            return None

        if feed.bozo and not feed.entries:
            logger.warning("[Layer 1 feedparser] 解析失败 %s: %s", url, feed.bozo_exception)
            return None

        if not feed.entries:
            logger.info("[Layer 1 feedparser] 无条目 %s, 尝试下一层", url)
            return None

        articles = self._entries_to_articles(feed.entries, feed.feed.get("title", ""))
        for a in articles:
            a["fetch_method"] = FETCH_RSS

        logger.info("[Layer 1 feedparser] %s → %d 篇", url[:60], len(articles))
        return articles

    # ------------------------------------------------------------------
    # Layer 2 — Scrapling static (httpx under the hood with fingerprint spoofing)
    # ------------------------------------------------------------------
    async def _try_scrapling_static(self, url: str) -> list[dict[str, Any]] | None:
        """Use Scrapling Fetcher for plain HTTP with anti-fingerprint headers."""
        try:
            from scrapling import Fetcher
        except ImportError:
            logger.debug("[Layer 2 Scrapling] scrapling 未安装, 跳过")
            return None

        try:
            loop = asyncio.get_event_loop()
            articles = await loop.run_in_executor(None, self._scrapling_static_sync, url)
            if articles is not None:
                logger.info("[Layer 2 Scrapling静态] %s → %d 篇", url[:60], len(articles))
            return articles
        except Exception as e:
            logger.warning("[Layer 2 Scrapling静态] 失败 %s: %s", url, e)
            return None

    @staticmethod
    def _scrapling_static_sync(url: str) -> list[dict[str, Any]] | None:
        from scrapling import Fetcher as _Fetcher
        fetcher = _Fetcher(auto_match=False)
        resp = fetcher.get(url)
        if resp.status != 200 or not resp.body:
            return None
        body: str = resp.body
        # If the body looks like RSS/Atom XML, try feedparser on it
        if "<rss" in body[:500].lower() or "<feed" in body[:500].lower():
            feed = feedparser.parse(body)
            if feed.entries:
                articles = RSSParser._entries_to_articles(feed.entries, feed.feed.get("title", ""))
                for a in articles:
                    a["fetch_method"] = FETCH_HTTP
                return articles
        # Otherwise treat as HTML — extract article-like links
        articles = RSSParser._extract_from_html(body, url)
        if articles:
            for a in articles:
                a["fetch_method"] = FETCH_HTTP
        return articles or None

    # ------------------------------------------------------------------
    # Layer 3 — Scrapling StealthyFetcher (headless Chromium)
    # ------------------------------------------------------------------
    async def _try_scrapling_stealthy(self, url: str) -> list[dict[str, Any]] | None:
        """Use Scrapling StealthyFetcher for JS-rendered / Cloudflare-protected pages."""
        try:
            from scrapling import StealthyFetcher
        except ImportError:
            logger.debug("[Layer 3 Scrapling深度] StealthyFetcher 不可用, 跳过")
            return None

        try:
            loop = asyncio.get_event_loop()
            articles = await loop.run_in_executor(None, self._scrapling_stealthy_sync, url)
            if articles is not None:
                logger.info("[Layer 3 Scrapling深度] %s → %d 篇", url[:60], len(articles))
            return articles
        except Exception as e:
            logger.warning("[Layer 3 Scrapling深度] 失败 %s: %s", url, e)
            return None

    @staticmethod
    def _scrapling_stealthy_sync(url: str) -> list[dict[str, Any]] | None:
        from scrapling import StealthyFetcher as _StealthyFetcher
        resp = _StealthyFetcher.fetch(url, headless=True)
        if resp.status != 200 or not resp.body:
            return None
        body: str = resp.body
        if "<rss" in body[:500].lower() or "<feed" in body[:500].lower():
            feed = feedparser.parse(body)
            if feed.entries:
                articles = RSSParser._entries_to_articles(feed.entries, feed.feed.get("title", ""))
                for a in articles:
                    a["fetch_method"] = FETCH_STEALTH
                return articles
        articles = RSSParser._extract_from_html(body, url)
        if articles:
            for a in articles:
                a["fetch_method"] = FETCH_STEALTH
        return articles or None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _entries_to_articles(entries: list, feed_title: str) -> list[dict[str, Any]]:
        """Convert feedparser entries to normalized article dicts."""
        articles: list[dict[str, Any]] = []
        for entry in entries:
            try:
                title = entry.get("title", "").strip()
                if not title:
                    continue

                link = entry.get("link", "")
                if not link:
                    links = entry.get("links", [])
                    for l in links:
                        if l.get("rel") == "alternate" or l.get("type", "").startswith("text/html"):
                            link = l.get("href", "")
                            break
                if not link:
                    continue

                content = ""
                if "content" in entry and entry.content:
                    content = entry.content[0].get("value", "")
                if not content:
                    content = entry.get("summary", "") or entry.get("description", "")

                content = RSSParser._strip_html(content)

                published_at = None
                for date_field in ("published_parsed", "updated_parsed", "created_parsed"):
                    time_struct = entry.get(date_field)
                    if time_struct:
                        try:
                            published_at = datetime.fromtimestamp(mktime(time_struct))
                        except (ValueError, OverflowError, OSError):
                            pass
                        break

                tags = []
                for tag_info in entry.get("tags", []):
                    term = tag_info.get("term", "")
                    if term:
                        tags.append(term)

                author = entry.get("author", "")
                article: dict[str, Any] = {
                    "title": title,
                    "url": link,
                    "content": content[:2000] if content else "",
                    "source_name": feed_title,
                    "source_type": "rss",
                    "tags": tags,
                    "published_at": published_at,
                }
                if author:
                    article["content"] = f"Author: {author}\n\n{article['content']}"

                articles.append(article)
            except Exception as e:
                logger.debug("Error parsing entry: %s", e)
                continue
        return articles

    @staticmethod
    def _extract_from_html(html: str, base_url: str) -> list[dict[str, Any]]:
        """Best-effort extraction of article-like items from raw HTML.

        Looks for <article>, <main>, or common heading+link patterns.
        """
        articles: list[dict[str, Any]] = []

        # Try to find links with associated text inside article/main sections
        # Pattern: <a href="...">title text</a> near a date or paragraph
        # This is a heuristic fallback for non-RSS pages
        link_pattern = re.compile(
            r'<a\s[^>]*href=["\']([^"\']+)["\'][^>]*>([^<]{10,200})</a>',
            re.IGNORECASE,
        )

        seen_urls: set[str] = set()
        for match in link_pattern.finditer(html):
            url = match.group(1).strip()
            title = RSSParser._strip_html(match.group(2)).strip()

            # Skip navigation / boilerplate links
            if not title or len(title) < 8:
                continue
            if any(skip in title.lower() for skip in ("登录", "注册", "关于", "联系", "首页", "更多", "home", "login", "sign up", "about", "contact")):
                continue

            # Resolve relative URLs
            if url.startswith("/"):
                try:
                    from urllib.parse import urljoin
                    url = urljoin(base_url, url)
                except Exception:
                    continue

            if url in seen_urls:
                continue
            seen_urls.add(url)

            articles.append({
                "title": title,
                "url": url,
                "content": "",
                "source_name": "",
                "source_type": "rss",
                "tags": [],
                "published_at": None,
            })

        return articles[:50]  # Cap at 50 to avoid noise

    @staticmethod
    def _strip_html(text: str) -> str:
        """Remove HTML tags from text."""
        if not text:
            return ""
        clean = re.sub(r"<[^>]+>", " ", text)
        clean = re.sub(r"\s+", " ", clean).strip()
        return clean


rss_parser = RSSParser()
