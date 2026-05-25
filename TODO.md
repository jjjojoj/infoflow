# InfoFlow Overhaul - Fix Plan

## Problem Summary
1. **Scheduler broken**: All APScheduler jobs are "missed" - no auto-crawl since 2026-05-22
2. **Only arXiv has articles (39)**: github_trending, zhihu, huawei_ascend all return 0 articles
3. **arXiv articles are irrelevant**: No keyword filtering applied (matches_keywords never called)
4. **Titles are English with [arXiv] prefix**: Not Chinese-friendly
5. **Only 4 sources**: Missing major Chinese AI/tech platforms
6. **relevance_score always 0.0**: Interest-based scoring never implemented

## Required Fixes (in priority order)

### Fix 1: Scheduler - Make auto-crawl actually work
File: `backend/app/services/scheduler.py`

- Add `misfire_grace_time=300` to the job config so missed jobs still execute
- Add per-source timeout (wrap _run_fetch_job with asyncio.wait_for, timeout 120s per source)
- Add better error logging (import logging properly, log exceptions with traceback)
- The scheduler should be resilient: if one scraper fails, others still run

### Fix 2: Keyword filtering in crawler
File: `backend/app/services/crawler.py`

- In `_store_articles()`, before storing, call the keyword filter from base.py:
  ```python
  from ..scrapers.base import KEYWORDS
  # Check if title or content matches any keyword
  text = f"{article_data.get('title', '')} {article_data.get('content', '')}"
  if not any(kw.lower() in text.lower() for kw in KEYWORDS):
      continue  # Skip irrelevant articles
  ```
- This ensures only relevant articles get stored

### Fix 3: Fix broken scrapers (github_trending, zhihu, huawei_ascend)

**github_trending.py**:
- The Scrapling + selectolax approach is unreliable in Docker
- Rewrite to use simple httpx + regex parsing (GitHub trending HTML structure is stable)
- Or use the unofficial GitHub trending API: parse `https://github.com/trending/python?since=daily`

**zhihu.py**:
- Zhihu search requires login/cookies - httpx alone won't work
- Switch to RSS approach: use `https://www.zhihu.com/rss` or parse Zhihu Hot via public API
- Or use Zhihu's public topic RSS feeds
- Better: switch to a more reliable source like 机器之心 RSS

**huawei_ascend.py**:
- hiascend.com uses heavy JS rendering
- Generic CSS selectors (`.post-item`, `.blog-item`) won't match
- Switch to a simpler approach: use hiascend.com RSS if available, or their public API
- Fallback: just mark this source as needing manual RSS URL configuration

### Fix 4: Add more platforms via RSS

Add new RSS sources that actually work. Register them in the DB on startup.
Recommended RSS feeds:

```python
NEW_RSS_SOURCES = [
    {"name": "机器之心", "url": "https://www.jiqizhixin.com/rss", "category": "AI新闻"},
    {"name": "量子位", "url": "https://www.qbitai.com/feed", "category": "AI新闻"},
    {"name": "HuggingFace Blog", "url": "https://huggingface.co/blog/feed.xml", "category": "AI技术"},
    {"name": "Papers with Code", "url": "https://paperswithcode.com/rss", "category": "论文"},
    {"name": "CSDN OCR", "url": "https://so.csdn.net/so/search?q=OCR&t=&u=&rss=1", "category": "技术博客"},
    {"name": "掘金 AI", "url": "https://rsshub.app/juejin/trending/ai/monthly", "category": "技术社区"},
]
```

Implementation:
- In `backend/app/main.py` lifespan, add a startup function that ensures these RSS sources exist in the DB
- The crawler already supports `source_type == "rss"` via `rss_parser.parse(url)`

### Fix 5: Chinese titles for non-Chinese articles

File: `backend/app/services/crawler.py` or `backend/app/services/ai_analyzer.py`

- For articles with non-Chinese titles, use the LLM (DashScope) to generate a Chinese title
- Add a `_translate_title(title, content_hint)` method
- Keep the original title in `content` field, store Chinese title in `title` field
- Format: `【arXiv】基于因果分层变分自编码器的腰椎DXA图像合成`
- Only translate if title is predominantly English (detect via regex: `len(re.findall(r'[a-zA-Z]', title)) > len(title) * 0.5`)

### Fix 6: Implement relevance_score
File: `backend/app/services/crawler.py`

- In `_store_articles()`, compute relevance_score based on Interest keywords:
  ```python
  # Get all enabled interests
  interests = await session.execute(select(Interest).where(Interest.enabled == True))
  interest_list = interests.scalars().all()
  
  # Score based on keyword matches
  score = 0.0
  text = f"{title} {content}".lower()
  for interest in interest_list:
      if interest.keyword.lower() in text:
          score += interest.weight
  
  article.relevance_score = min(score, 1.0)  # Cap at 1.0
  ```

### Fix 7: Source display names in Chinese

Update source names to show Chinese in the frontend:
- arxiv → "arXiv 论文"
- github_trending → "GitHub 热门"  
- zhihu → "知乎"
- huawei_ascend → "昇腾社区"
- RSS sources should use their display name directly

This can be done via a mapping dict in the frontend or by adding a `display_name` field to Source model.

## DO NOT:
- Delete existing code - modify in place
- Change the database schema (we can add columns but not remove)
- Break the existing API contract
- Remove the .env file or API keys

## Commit when done with message: "fix: overhaul crawler, scheduler, filtering, add RSS sources"
