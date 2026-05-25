"""GitHub Trending scraper."""
from __future__ import annotations

import html
import logging
import re
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
        self._url = "https://github.com/trending/python?since=daily"

    async def fetch(self, **kwargs: Any) -> list[dict[str, Any]]:
        """Fetch GitHub Trending page and parse repos.

        Uses plain httpx because browser-style fetchers are brittle in Docker.
        """
        html = await self._fetch_html()
        if not html:
            return []
        return await self.parse(html)

    async def _fetch_html(self) -> str:
        """Get the trending page HTML."""
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
            logger.error("GitHub Trending fetch failed: %s", e)
            return ""

    async def parse(self, raw_data: Any) -> list[dict[str, Any]]:
        """Parse trending page HTML into article dicts using regex."""
        raw_html = str(raw_data)
        articles: list[dict[str, Any]] = []

        rows = re.findall(
            r"<article\b[^>]*class=\"[^\"]*Box-row[^\"]*\"[^>]*>(.*?)</article>",
            raw_html,
            flags=re.IGNORECASE | re.DOTALL,
        )

        for row in rows:
            try:
                repo_match = re.search(
                    r"<h2\b[^>]*>.*?<a\b[^>]*href=\"/([^\"?#]+)\"[^>]*>(.*?)</a>.*?</h2>",
                    row,
                    flags=re.IGNORECASE | re.DOTALL,
                )
                if not repo_match:
                    repo_match = re.search(
                        r"<a\b[^>]*href=\"/([^\"?#]+/[^\"?#]+)\"[^>]*>",
                        row,
                        flags=re.IGNORECASE | re.DOTALL,
                    )
                if not repo_match:
                    continue

                repo_path = html.unescape(repo_match.group(1)).strip("/")
                if repo_path.count("/") != 1:
                    continue
                repo_path = re.sub(r"\s+", "", repo_path)
                if not repo_path:
                    continue

                repo_name = repo_path.replace("/", " / ")

                description = ""
                desc_match = re.search(
                    r"<p\b[^>]*>(.*?)</p>",
                    row,
                    flags=re.IGNORECASE | re.DOTALL,
                )
                if desc_match:
                    description = self._clean_html(desc_match.group(1))

                language = ""
                lang_match = re.search(
                    r"<span\b[^>]*itemprop=\"programmingLanguage\"[^>]*>(.*?)</span>",
                    row,
                    flags=re.IGNORECASE | re.DOTALL,
                )
                if lang_match:
                    language = self._clean_html(lang_match.group(1))

                stars_text = ""
                star_match = re.search(
                    r'href="/%s/stargazers"[^>]*>(.*?)</a>' % re.escape(repo_path),
                    row,
                    flags=re.IGNORECASE | re.DOTALL,
                )
                if star_match:
                    stars_text = self._clean_html(star_match.group(1)).replace(",", "")

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

    @staticmethod
    def _clean_html(value: str) -> str:
        """Strip tags/entities and normalize whitespace."""
        value = re.sub(r"<[^>]+>", " ", value)
        value = html.unescape(value)
        return re.sub(r"\s+", " ", value).strip()
