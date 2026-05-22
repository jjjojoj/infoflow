"""APScheduler-based background scheduler.

Drives periodic crawling and AI analysis jobs. Started/stopped from
the FastAPI lifespan handler.
"""
from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from ..config import settings

logger = logging.getLogger(__name__)


class SchedulerService:
    """Wraps an ``AsyncIOScheduler`` with InfoFlow-specific jobs."""

    def __init__(self) -> None:
        self._scheduler: AsyncIOScheduler | None = None

    def start(self) -> None:
        """Start the scheduler and register periodic crawl jobs."""
        if self._scheduler is not None and self._scheduler.running:
            return
        self._scheduler = AsyncIOScheduler(timezone="UTC")

        # Register the periodic crawl job
        self._scheduler.add_job(
            self._run_fetch_job,
            "interval",
            minutes=settings.FETCH_INTERVAL_MINUTES,
            id="fetch_all_sources",
            name="Fetch all sources",
            replace_existing=True,
        )

        self._scheduler.start()
        logger.info(
            "Scheduler started (fetch interval: %s minutes)",
            settings.FETCH_INTERVAL_MINUTES,
        )

    def shutdown(self) -> None:
        """Stop the scheduler if running."""
        if self._scheduler is not None and self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("Scheduler stopped")
        self._scheduler = None

    def update_interval(self, minutes: int) -> None:
        """Dynamically update the fetch interval.

        Reschedules the crawl job with the new interval.
        """
        if self._scheduler is None or not self._scheduler.running:
            logger.warning("Scheduler not running, cannot update interval")
            return

        self._scheduler.reschedule_job(
            "fetch_all_sources",
            trigger="interval",
            minutes=minutes,
        )
        logger.info("Fetch interval updated to %d minutes", minutes)

    async def run_fetch_job(self) -> int:
        """Execute a one-time fetch job (callable externally).

        Calls CrawlerService.run_all() and returns new article count.
        """
        return await self._run_fetch_job()

    async def _run_fetch_job(self) -> int:
        """Internal: execute the crawl job."""
        # Import here to avoid circular imports
        from .crawler import crawler_service

        logger.info("Scheduler: running fetch job...")
        try:
            new_count = await crawler_service.run_all()
            logger.info("Scheduler: fetch job complete. %d new articles.", new_count)
            return new_count
        except Exception as e:
            logger.error("Scheduler: fetch job failed: %s", e)
            return 0


scheduler_service = SchedulerService()
