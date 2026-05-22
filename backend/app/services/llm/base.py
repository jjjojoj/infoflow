"""Abstract LLM client interface and factory function."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import date
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


# 模型费用映射(元 / 1K tokens)，根据官方定价配置
_COST_PER_1K: dict[str, float] = {
    "qwen-plus": 0.004,
    "qwen-turbo": 0.002,
    "qwen-max": 0.02,
    "deepseek-chat": 0.001,
    "gpt-4o-mini": 0.01,
    "gpt-4o": 0.05,
}


class LLMResponse(BaseModel):
    """Structured response from an LLM call."""

    content: str
    model: str
    usage: dict  # tokens used


class BaseLLM(ABC):
    """LLM 统一接口基类 - 所有 LLM 适配器必须实现此接口。"""

    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> LLMResponse:
        """发送对话请求。"""
        ...

    @abstractmethod
    async def summarize(self, text: str, max_length: int = 200) -> str:
        """生成文本摘要。"""
        ...

    @abstractmethod
    async def extract_keywords(self, text: str, max_keywords: int = 10) -> list[str]:
        """提取关键词。"""
        ...

    @abstractmethod
    async def classify(self, text: str, categories: list[str]) -> dict:
        """文本分类，返回 {category: confidence_score}。"""
        ...

    async def _record_usage(
        self, model: str, prompt_tokens: int, completion_tokens: int
    ) -> None:
        """记录 token 使用量到数据库（按天+模型累加）。"""
        try:
            from ...database import AsyncSessionLocal
            from ...models import LLMUsage

            total = prompt_tokens + completion_tokens
            today = date.today().isoformat()
            cost_rate = _COST_PER_1K.get(model, 0.004)
            cost = total / 1000.0 * cost_rate

            async with AsyncSessionLocal() as session:
                from sqlalchemy import select

                stmt = select(LLMUsage).where(
                    LLMUsage.date == today, LLMUsage.model == model
                )
                result = await session.execute(stmt)
                record = result.scalar_one_or_none()

                if record:
                    record.prompt_tokens += prompt_tokens
                    record.completion_tokens += completion_tokens
                    record.total_tokens += total
                    record.request_count += 1
                    record.cost_estimate += cost
                else:
                    record = LLMUsage(
                        date=today,
                        model=model,
                        prompt_tokens=prompt_tokens,
                        completion_tokens=completion_tokens,
                        total_tokens=total,
                        request_count=1,
                        cost_estimate=cost,
                    )
                    session.add(record)
                await session.commit()
        except Exception as exc:
            logger.warning("Failed to record LLM usage: %s", exc)


def get_llm_provider(provider: str | None = None) -> BaseLLM:
    """工厂函数，根据配置返回对应 LLM 实例。

    Parameters
    ----------
    provider : str | None
        强制指定 provider 名称。为 None 时从 settings.LLM_PROVIDER 读取。
    """
    from ...config import settings

    chosen = provider or settings.LLM_PROVIDER

    if chosen == "deepseek":
        from .deepseek import DeepSeekLLM

        return DeepSeekLLM(api_key=settings.DEEPSEEK_API_KEY)
    elif chosen == "openai":
        from .openai_adapter import OpenAILLM

        return OpenAILLM(api_key=settings.OPENAI_API_KEY)
    elif chosen == "ollama":
        from .ollama import OllamaLLM

        return OllamaLLM(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
        )
    elif chosen == "dashscope":
        from .dashscope import DashScopeLLM

        return DashScopeLLM(api_key=settings.DASHSCOPE_API_KEY)
    else:
        raise ValueError(f"不支持的 LLM provider: {chosen}，可选: deepseek, openai, ollama, dashscope")
