"""Direct crawl test: run crawler and check what happens at each step."""
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


async def test():
    from sqlalchemy import select, func
    from app.database import AsyncSessionLocal
    from app.models import Article, Source
    from app.scrapers.arxiv import ArxivScraper
    from app.services.dedup import dedup_engine

    # Step 1: scrape
    print("Step 1: Scraping arxiv...", flush=True)
    scraper = ArxivScraper()
    articles = await scraper.fetch()
    print(f"  Scraped {len(articles)} articles", flush=True)

    # Step 2: check dedup on first article
    if articles:
        async with AsyncSessionLocal() as session:
            art = articles[0]
            print(f"\nStep 2: Testing dedup on '{art['title'][:60]}...'", flush=True)
            is_dup = await dedup_engine.is_duplicate(art, session)
            print(f"  is_duplicate = {is_dup}", flush=True)

            # Step 3: try inserting manually
            print(f"\nStep 3: Manual insert test...", flush=True)
            from app.services.dedup import content_hash
            hash_value = content_hash(art.get("content", ""))
            db_article = Article(
                title=art.get("title", ""),
                url=art.get("url", ""),
                content=art.get("content", ""),
                source_name=art.get("source_name", ""),
                source_type=art.get("source_type", ""),
                tags=art.get("tags", []),
                content_hash=hash_value,
            )
            session.add(db_article)
            await session.commit()
            print(f"  Inserted article id={db_article.id}", flush=True)

            # Step 4: count
            count = (await session.execute(select(func.count(Article.id)))).scalar()
            print(f"\nStep 4: Total articles in DB: {count}", flush=True)

    # Step 5: Now run the full crawler service
    print("\nStep 5: Running full crawler_service.run_all()...", flush=True)
    from app.services.crawler import crawler_service
    new_count = await crawler_service.run_all()
    print(f"  New articles from run_all: {new_count}", flush=True)

    # Final count
    async with AsyncSessionLocal() as session:
        count = (await session.execute(select(func.count(Article.id)))).scalar()
        by_source = (await session.execute(
            select(Article.source_name, func.count(Article.id))
            .group_by(Article.source_name)
        )).all()
        print(f"\n  Final total: {count} articles", flush=True)
        for src, cnt in by_source:
            print(f"    {src}: {cnt}", flush=True)


if __name__ == "__main__":
    asyncio.run(test())
