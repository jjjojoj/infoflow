"""RSS feed parser using ``feedparser``.

Converts RSS/Atom feeds into normalized article payloads.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from functools import partial
from time import mktime
from typing import Any

import feedparser

logger = logging.getLogger(__name__)


class RSSParser:
    """Parse RSS/Atom feeds into normalized records."""

    async def parse(self, url: str) -> list[dict[str, Any]]:
        """Fetch and parse an RSS/Atom feed from ``url``.

        Uses feedparser in a thread executor since it performs blocking I/O.
        Returns a list of normalized article dicts.
        """
        try:
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(None, partial(feedparser.parse, url))
        except Exception as e:
            logger.error("Failed to fetch/parse RSS feed %s: %s", url, e)
            return []

        if feed.bozo and not feed.entries:
            logger.warning("RSS feed %s has errors and no entries: %s", url, feed.bozo_exception)
            return []

        articles: list[dict[str, Any]] = []
        feed_title = feed.feed.get("title", "RSS")

        for entry in feed.entries:
            try:
                title = entry.get("title", "").strip()
                if not title:
                    continue

                # Get link
                link = entry.get("link", "")
                if not link:
                    # Try alternate links
                    links = entry.get("links", [])
                    for l in links:
                        if l.get("rel") == "alternate" or l.get("type", "").startswith("text/html"):
                            link = l.get("href", "")
                            break
                if not link:
                    continue

                # Content / summary
                content = ""
                if "content" in entry and entry.content:
                    content = entry.content[0].get("value", "")
                if not content:
                    content = entry.get("summary", "") or entry.get("description", "")

                # Strip HTML tags from content for plain text
                content = self._strip_html(content)

                # Published date
                published_at = None
                for date_field in ("published_parsed", "updated_parsed", "created_parsed"):
                    time_struct = entry.get(date_field)
                    if time_struct:
                        try:
                            published_at = datetime.fromtimestamp(mktime(time_struct))
                        except (ValueError, OverflowError, OSError):
                            pass
                        break

                # Tags / categories
                tags = []
                for tag_info in entry.get("tags", []):
                    term = tag_info.get("term", "")
                    if term:
                        tags.append(term)

                # Author
                author = entry.get("author", "")

                article = {
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
                logger.debug("Error parsing RSS entry: %s", e)
                continue

        logger.info("RSS (%s): parsed %d articles", url[:50], len(articles))
        return articles

    @staticmethod
    def _strip_html(text: str) -> str:
        """Remove HTML tags from text using a simple approach."""
        if not text:
            return ""
        import re
        # Remove HTML tags
        clean = re.sub(r"<[^>]+>", " ", text)
        # Normalize whitespace
        clean = re.sub(r"\s+", " ", clean).strip()
        return clean


rss_parser = RSSParser()
