"""Batch generate Chinese summaries for all articles missing them."""
import asyncio
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def main():
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models import Article
    from app.services.ai_analyzer import ai_analyzer

    async with AsyncSessionLocal() as session:
        # Find articles without summary
        result = await session.execute(
            select(Article).where(
                (Article.summary == None) | (Article.summary == "")  # noqa: E711
            )
        )
        articles = result.scalars().all()
        total = len(articles)
        logger.info(f"Found {total} articles without summary")

        success = 0
        failed = 0
        for i, article in enumerate(articles):
            # Build text for summarization
            title = article.title or ""
            content = article.content or ""
            text_to_summarize = f"标题：{title}\n\n内容：{content[:3000]}" if content else f"标题：{title}"

            try:
                logger.info(f"[{i+1}/{total}] Generating summary for: {title[:60]}...")
                summary = await ai_analyzer.generate_summary(text_to_summarize)
                if summary:
                    article.summary = summary
                    await session.commit()
                    success += 1
                    logger.info(f"  -> OK: {summary[:80]}...")
                else:
                    failed += 1
                    logger.warning(f"  -> EMPTY summary")
            except Exception as e:
                failed += 1
                logger.error(f"  -> FAILED: {e}")
                # Rollback this article's changes
                await session.rollback()

            # Rate limit: pause between requests
            if i < total - 1:
                await asyncio.sleep(1)

    logger.info(f"Done! Success: {success}, Failed: {failed}")


if __name__ == "__main__":
    asyncio.run(main())
