"""arXiv scraper - pulls newest papers from arXiv RSS / API endpoints."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from xml.etree import ElementTree

import httpx

from .base import BaseScraper, RawArticle

logger = logging.getLogger(__name__)

# arXiv API namespaces
_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}

# Search queries — narrow to user's core interests only
_SEARCH_QUERIES = [
    "cat:cs.CV AND (OCR OR text recognition OR document understanding)",
    "cat:cs.CV AND (Ascend OR NPU OR model deployment OR inference optimization)",
    "cat:cs.AI AND (Ascend OR NPU OR edge inference)",
    "cat:cs.CL AND (DeepSeek OR Qwen) AND (model OR deployment OR serving)",
    "cat:cs.CV AND (quantization OR pruning OR distillation) AND (vision OR multimodal)",
]


class ArxivScraper(BaseScraper):
    """Scrape arXiv listings for cs.CV and cs.AI papers related to OCR."""

    name = "arxiv"
    source_type = "crawler"

    def __init__(self) -> None:
        self._base_url = "http://export.arxiv.org/api/query"

    async def fetch(self, **kwargs: Any) -> list[dict[str, Any]]:
        """Fetch recent papers from arXiv API matching OCR-related queries."""
        all_articles: list[dict[str, Any]] = []
        seen_urls: set[str] = set()

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            for query in _SEARCH_QUERIES:
                try:
                    params = {
                        "search_query": query,
                        "start": 0,
                        "max_results": 20,
                        "sortBy": "submittedDate",
                        "sortOrder": "descending",
                    }
                    resp = await client.get(self._base_url, params=params)
                    resp.raise_for_status()
                    articles = await self.parse(resp.text)

                    for art in articles:
                        if art["url"] not in seen_urls:
                            seen_urls.add(art["url"])
                            all_articles.append(art)

                except Exception as e:
                    logger.warning("arXiv query failed (%s): %s", query[:40], e)
                    continue

        logger.info("arXiv: fetched %d papers", len(all_articles))
        return all_articles

    async def parse(self, raw_data: Any) -> list[dict[str, Any]]:
        """Parse arXiv Atom XML response into article dicts."""
        articles: list[dict[str, Any]] = []

        try:
            root = ElementTree.fromstring(raw_data)
        except ElementTree.ParseError as e:
            logger.error("Failed to parse arXiv XML: %s", e)
            return []

        for entry in root.findall("atom:entry", _NS):
            try:
                title_el = entry.find("atom:title", _NS)
                title = title_el.text.strip().replace("\n", " ") if title_el is not None and title_el.text else ""
                if not title:
                    continue

                # Get the abstract link (paper page)
                url = ""
                pdf_url = ""
                for link in entry.findall("atom:link", _NS):
                    href = link.get("href", "")
                    link_type = link.get("type", "")
                    rel = link.get("rel", "")
                    if link_type == "text/html" or rel == "alternate":
                        url = href
                    elif "pdf" in href or link_type == "application/pdf":
                        pdf_url = href

                if not url:
                    # Fallback: use id as url
                    id_el = entry.find("atom:id", _NS)
                    url = id_el.text.strip() if id_el is not None and id_el.text else ""

                if not url:
                    continue

                # Summary / abstract
                summary_el = entry.find("atom:summary", _NS)
                summary = summary_el.text.strip().replace("\n", " ") if summary_el is not None and summary_el.text else ""

                # Authors
                authors = []
                for author_el in entry.findall("atom:author", _NS):
                    name_el = author_el.find("atom:name", _NS)
                    if name_el is not None and name_el.text:
                        authors.append(name_el.text.strip())

                # Published date
                published_at = None
                published_el = entry.find("atom:published", _NS)
                if published_el is not None and published_el.text:
                    try:
                        published_at = datetime.fromisoformat(
                            published_el.text.strip().replace("Z", "+00:00")
                        )
                    except ValueError:
                        pass

                # Categories
                tags = ["arxiv"]
                for cat in entry.findall("arxiv:primary_category", _NS):
                    term = cat.get("term", "")
                    if term:
                        tags.append(term)
                for cat in entry.findall("atom:category", _NS):
                    term = cat.get("term", "")
                    if term and term not in tags:
                        tags.append(term)

                content = f"Authors: {', '.join(authors[:5])}\n\n{summary}"
                if pdf_url:
                    content += f"\n\nPDF: {pdf_url}"

                article = RawArticle(
                    title=f"[arXiv] {title}",
                    url=url,
                    content=content,
                    source_name=self.name,
                    source_type=self.source_type,
                    tags=tags,
                    published_at=published_at,
                )
                articles.append(article.to_dict())

            except Exception as e:
                logger.debug("Error parsing arXiv entry: %s", e)
                continue

        return articles
