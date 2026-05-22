"""Abstract LLM client interface and factory function."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


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
    else:
        raise ValueError(f"不支持的 LLM provider: {chosen}，可选: deepseek, openai, ollama")
