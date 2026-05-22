"""Base scraper interface used by every site-specific scraper."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


# Predefined keywords for filtering relevant content
KEYWORDS = [
    "昇腾910b", "鲲鹏", "OCR", "信创", "CANN", "MindSpore",
    "PaddleOCR", "文字识别", "模型部署", "国产化", "深度学习",
    "ascend", "mindspore", "paddleocr",
]


@dataclass
class RawArticle:
    """Normalized article payload produced by every scraper."""

    title: str
    url: str
    content: str = ""
    source_name: str = ""
    source_type: str = "crawler"
    tags: list[str] = field(default_factory=list)
    published_at: datetime | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to a plain dict suitable for database insertion."""
        return {
            "title": self.title,
            "url": self.url,
            "content": self.content,
            "source_name": self.source_name,
            "source_type": self.source_type,
            "tags": self.tags,
            "published_at": self.published_at,
        }


class BaseScraper(ABC):
    """Common contract: ``fetch()`` returns normalized article dicts."""

    name: str = "base"
    source_type: str = "crawler"

    @abstractmethod
    async def fetch(self, **kwargs: Any) -> list[dict[str, Any]]:
        """Return a list of normalized article payloads."""

    @abstractmethod
    async def parse(self, raw_data: Any) -> list[dict[str, Any]]:
        """Parse raw fetched data into normalized article dicts."""

    def matches_keywords(self, text: str, extra_keywords: list[str] | None = None) -> bool:
        """Check whether text matches any of the predefined keywords."""
        if not text:
            return False
        text_lower = text.lower()
        keywords = KEYWORDS + (extra_keywords or [])
        return any(kw.lower() in text_lower for kw in keywords)
