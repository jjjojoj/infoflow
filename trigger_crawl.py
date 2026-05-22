"""Trigger a full crawl of all sources and report results."""
import asyncio
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models import Article
from app.services.crawler import crawler_service


async def main():
    print("=" * 50)
    print("Starting full crawl of all 4 sources...")
    print("=" * 50)

    total_new = await crawler_service.run_all()

    print(f"\nTotal new articles fetched: {total_new}")

    # Show breakdown by source
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Article.source_name, func.count(Article.id))
            .group_by(Article.source_name)
        )
        breakdown = result.all()
        print("\n--- Articles by source ---")
        for source_name, count in breakdown:
            print(f"  {source_name}: {count} articles")

        total = await session.execute(select(func.count(Article.id)))
        print(f"\n  TOTAL in DB: {total.scalar()} articles")

        # Show a few sample titles
        result = await session.execute(
            select(Article.title, Article.source_name)
            .order_by(Article.created_at.desc())
            .limit(8)
        )
        print("\n--- Latest articles ---")
        for title, src in result.all():
            print(f"  [{src}] {title[:70]}")


if __name__ == "__main__":
    asyncio.run(main())
