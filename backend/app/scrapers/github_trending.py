"""GitHub Trending scraper."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import httpx

from .base import BaseScraper, RawArticle

logger = logging.getLogger(__name__)

# Keywords to filter relevant repos
_FILTER_KEYWORDS = [
    "ocr", "深度学习", "模型部署", "ascend", "mindspore",
    "paddleocr", "cann", "text recognition", "document ai",
    "object detection", "model deployment", "inference",
    "onnx", "tensorrt", "deep learning", "computer vision",
    "信创", "鲲鹏", "昇腾",
]


class GitHubTrendingScraper(BaseScraper):
    """Scrape https://github.com/trending for daily/weekly trending repos."""

    name = "github_trending"
    source_type = "crawler"

    def __init__(self) -> None:
        self._url = "https://github.com/trending"

    async def fetch(self, **kwargs: Any) -> list[dict[str, Any]]:
        """Fetch GitHub Trending page and parse repos.

        Attempts to use Scrapling Fetcher first; falls back to httpx if unavailable.
        """
        html = await self._fetch_html()
        if not html:
            return []
        return await self.parse(html)

    async def _fetch_html(self) -> str:
        """Get the trending page HTML with fallback strategy."""
        # Try Scrapling Fetcher first
        try:
            from scrapling import Fetcher

            fetcher = Fetcher()
            response = fetcher.get(self._url)
            if response and response.status == 200:
                return response.text
        except Exception as e:
            logger.warning("Scrapling Fetcher failed for GitHub Trending, falling back to httpx: %s", e)

        # Fallback to httpx
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                resp = await client.get(
                    self._url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept-Language": "en-US,en;q=0.9",
                    },
                )
                resp.raise_for_status()
                return resp.text
        except Exception as e:
            logger.error("httpx fallback also failed for GitHub Trending: %s", e)
            return ""

    async def parse(self, raw_data: Any) -> list[dict[str, Any]]:
        """Parse trending page HTML into article dicts."""
        try:
            from selectolax.parser import HTMLParser
        except ImportError:
            logger.error("selectolax not available, cannot parse GitHub Trending page")
            return []

        tree = HTMLParser(raw_data)
        articles: list[dict[str, Any]] = []

        for row in tree.css("article.Box-row"):
            try:
                # Repository name (owner/repo)
                h2 = row.css_first("h2 a")
                if not h2:
                    continue
                repo_path = h2.attributes.get("href", "").strip("/")
                if not repo_path:
                    continue
                repo_name = repo_path.replace("/", " / ").strip()

                # Description
                p_tag = row.css_first("p")
                description = p_tag.text(strip=True) if p_tag else ""

                # Language
                lang_span = row.css_first("[itemprop='programmingLanguage']")
                language = lang_span.text(strip=True) if lang_span else ""

                # Stars
                stars_text = ""
                star_links = row.css("a.Link--muted")
                if star_links:
                    stars_text = star_links[0].text(strip=True).replace(",", "")

                # Filter by keywords
                combined_text = f"{repo_name} {description} {language}".lower()
                if not any(kw.lower() in combined_text for kw in _FILTER_KEYWORDS):
                    continue

                url = f"https://github.com/{repo_path}"
                content = f"{description}\n\nLanguage: {language}\nStars: {stars_text}"

                tags = ["github-trending"]
                if language:
                    tags.append(language.lower())

                article = RawArticle(
                    title=f"[GitHub Trending] {repo_name}",
                    url=url,
                    content=content,
                    source_name=self.name,
                    source_type=self.source_type,
                    tags=tags,
                    published_at=datetime.utcnow(),
                )
                articles.append(article.to_dict())

            except Exception as e:
                logger.debug("Error parsing a GitHub trending row: %s", e)
                continue

        logger.info("GitHub Trending: found %d relevant repos", len(articles))
        return articles
