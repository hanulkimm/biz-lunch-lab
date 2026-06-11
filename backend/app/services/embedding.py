"""OpenAI 임베딩 — 리뷰 텍스트를 벡터로 변환.

임베딩 텍스트 형식: "{식당명} {카테고리} {태그..} {코멘트}"
출력 차원은 Pinecone 인덱스에 맞춰 settings.embedding_dimensions(512).
"""
from openai import OpenAI

from app.config import settings

_client = OpenAI(api_key=settings.openai_api_key)


def build_text(name: str, category: str | None, tags: list[str], comment: str | None) -> str:
    parts = [name, category or "", " ".join(tags), comment or ""]
    return " ".join(p for p in parts if p).strip()


def embed(text: str) -> list[float]:
    res = _client.embeddings.create(
        model=settings.embedding_model,
        input=text,
        dimensions=settings.embedding_dimensions,
    )
    return res.data[0].embedding
