"""Deduplication engine with three-layer detection.

Layer 1: URL hash - exact URL match
Layer 2: Content fingerprint - MD5/SHA256 content hash
Layer 3: Title similarity - SequenceMatcher-based fuzzy matching
"""
from __future__ import annotations

import hashlib
import logging
from difflib import SequenceMatcher
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import AsyncSessionLocal
from ..models import Article

logger = logging.getLogger(__name__)

# Title similarity threshold - above this, consider duplicate
TITLE_SIMILARITY_THRESHOLD = 0.85


def content_hash(text: str) -> str:
    """Stable SHA-256 hash of normalized text content."""
    normalized = (text or "").strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class DedupEngine:
    """Three-layer deduplication engine for articles."""

    async def is_duplicate(self, article: dict[str, Any], session: AsyncSession | None = None) -> bool:
        """Three-layer duplicate check.

        Layer 1: URL hash - identical URLs are immediate duplicates
        Layer 2: Content fingerprint - same content hash means duplicate
        Layer 3: Title similarity - titles above 0.85 similarity are duplicates

        Args:
            article: Dict with at least 'title', 'url', and optionally 'content'.
            session: Optional AsyncSession. If not provided, creates a new one.

        Returns:
            True if the article is considered a duplicate.
        """
        close_session = False
        if session is None:
            session = AsyncSessionLocal()
            close_session = True

        try:
            # Layer 1: URL exact match
            url = article.get("url", "")
            if url and await self._check_url_duplicate(url, session):
                logger.debug("Dedup Layer 1 (URL): duplicate found for %s", url[:80])
                return True

            # Layer 2: Content hash
            article_content = article.get("content", "")
            if article_content:
                hash_value = self.compute_content_hash(article_content)
                if await self._check_hash_duplicate(hash_value, session):
                    logger.debug("Dedup Layer 2 (Content Hash): duplicate found")
                    return True

            # Layer 3: Title similarity
            title = article.get("title", "")
            if title and await self._check_title_duplicate(title, session):
                logger.debug("Dedup Layer 3 (Title Similarity): duplicate found for '%s'", title[:50])
                return True

            return False

        finally:
            if close_session:
                await session.close()

    async def _check_url_duplicate(self, url: str, session: AsyncSession) -> bool:
        """Layer 1: Check if URL already exists in database."""
        stmt = select(Article.id).where(Article.url == url).limit(1)
        result = await session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def _check_hash_duplicate(self, hash_value: str, session: AsyncSession) -> bool:
        """Layer 2: Check if content hash already exists."""
        stmt = select(Article.id).where(Article.content_hash == hash_value).limit(1)
        result = await session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def _check_title_duplicate(self, title: str, session: AsyncSession) -> bool:
        """Layer 3: Check title similarity against recent articles.

        Only compares against the last 200 articles for performance.
        """
        stmt = (
            select(Article.title)
            .order_by(Article.created_at.desc())
            .limit(200)
        )
        result = await session.execute(stmt)
        existing_titles = [row[0] for row in result.fetchall()]

        for existing_title in existing_titles:
            similarity = self.title_similarity(title, existing_title)
            if similarity >= TITLE_SIMILARITY_THRESHOLD:
                return True

        return False

    def compute_content_hash(self, content: str) -> str:
        """Compute a stable content fingerprint using SHA-256.

        Normalizes text before hashing to reduce false negatives.
        """
        return content_hash(content)

    def title_similarity(self, title1: str, title2: str) -> float:
        """Compute title similarity using SequenceMatcher.

        Returns a float between 0.0 and 1.0.
        """
        if not title1 or not title2:
            return 0.0
        # Normalize: lowercase and strip common prefixes like [arXiv], [GitHub Trending]
        t1 = self._normalize_title(title1)
        t2 = self._normalize_title(title2)
        return SequenceMatcher(None, t1, t2).ratio()

    @staticmethod
    def _normalize_title(title: str) -> str:
        """Normalize a title for comparison: lowercase, strip source prefixes."""
        import re
        # Remove common source prefixes like [arXiv], [GitHub Trending], [知乎], etc.
        normalized = re.sub(r"^\[.*?\]\s*", "", title)
        return normalized.strip().lower()


# Module-level singleton
dedup_engine = DedupEngine()

# Keep backward-compatible alias
dedup_service = dedup_engine
