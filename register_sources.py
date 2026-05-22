"""Register all 4 sources into the InfoFlow database."""
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Source


async def register_sources():
    sources_data = [
        {
            "name": "arxiv",
            "url": "http://export.arxiv.org/api/query",
            "source_type": "crawler",
            "enabled": True,
            "fetch_interval": 60,
        },
        {
            "name": "github_trending",
            "url": "https://github.com/trending",
            "source_type": "crawler",
            "enabled": True,
            "fetch_interval": 120,
        },
        {
            "name": "zhihu",
            "url": "https://www.zhihu.com",
            "source_type": "crawler",
            "enabled": True,
            "fetch_interval": 60,
        },
        {
            "name": "huawei_ascend",
            "url": "https://www.hiascend.com",
            "source_type": "crawler",
            "enabled": True,
            "fetch_interval": 120,
        },
    ]

    async with AsyncSessionLocal() as session:
        for s in sources_data:
            existing = await session.execute(
                select(Source).where(Source.name == s["name"])
            )
            if existing.scalar_one_or_none():
                print(f"  SKIP: {s['name']} already exists")
                continue
            source = Source(**s, config={})
            session.add(source)
            print(f"  OK: registered {s['name']}")
        await session.commit()

        # Verify
        result = await session.execute(select(Source))
        all_sources = result.scalars().all()
        print(f"\nTotal sources registered: {len(all_sources)}")
        for src in all_sources:
            print(
                f"  [{src.id}] {src.name} | type={src.source_type} | "
                f"enabled={src.enabled} | interval={src.fetch_interval}min"
            )


if __name__ == "__main__":
    asyncio.run(register_sources())
