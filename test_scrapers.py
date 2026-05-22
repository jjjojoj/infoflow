"""Quick test of each scraper to diagnose why they return 0 articles."""
import asyncio
import sys


async def test_all():
    print("=" * 60, flush=True)

    # Test 1: arxiv
    print("\n[1/4] Testing arxiv scraper...", flush=True)
    try:
        from app.scrapers.arxiv import ArxivScraper
        scraper = ArxivScraper()
        articles = await scraper.fetch()
        print(f"  Result: {len(articles)} articles", flush=True)
        for a in articles[:3]:
            print(f"    - {a['title'][:70]}", flush=True)
    except Exception as e:
        print(f"  ERROR: {e}", flush=True)

    # Test 2: github trending
    print("\n[2/4] Testing github_trending scraper...", flush=True)
    try:
        from app.scrapers.github_trending import GitHubTrendingScraper
        scraper = GitHubTrendingScraper()
        articles = await scraper.fetch()
        print(f"  Result: {len(articles)} articles", flush=True)
        for a in articles[:3]:
            print(f"    - {a['title'][:70]}", flush=True)
    except Exception as e:
        print(f"  ERROR: {e}", flush=True)

    # Test 3: zhihu
    print("\n[3/4] Testing zhihu scraper...", flush=True)
    try:
        from app.scrapers.zhihu import ZhihuScraper
        scraper = ZhihuScraper()
        articles = await scraper.fetch()
        print(f"  Result: {len(articles)} articles", flush=True)
        for a in articles[:3]:
            print(f"    - {a['title'][:70]}", flush=True)
    except Exception as e:
        print(f"  ERROR: {e}", flush=True)

    # Test 4: huawei ascend
    print("\n[4/4] Testing huawei_ascend scraper...", flush=True)
    try:
        from app.scrapers.huawei_ascend import HuaweiAscendScraper
        scraper = HuaweiAscendScraper()
        articles = await scraper.fetch()
        print(f"  Result: {len(articles)} articles", flush=True)
        for a in articles[:5]:
            print(f"    - {a['title'][:70]}", flush=True)
    except Exception as e:
        print(f"  ERROR: {e}", flush=True)

    print("\n" + "=" * 60, flush=True)


if __name__ == "__main__":
    asyncio.run(test_all())
