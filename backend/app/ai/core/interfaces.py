from abc import ABC, abstractmethod
from typing import Dict, Any, AsyncGenerator

class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate_stream(self, prompt: str, context: list) -> AsyncGenerator[str, None]:
        pass

class BaseEmbeddingProvider(ABC):
    @abstractmethod
    async def generate_embeddings(self, text_chunks: list[str]) -> list[list[float]]:
        pass
