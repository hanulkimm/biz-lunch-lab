"""Pinecone 클라이언트 — 리뷰 벡터 upsert / delete / 유사도 검색.

벡터 ID = reviews.id (1:1). 메타데이터에 식당/리뷰 정보를 담아 RAG에서 활용.
"""
from pinecone import Pinecone

from app.config import settings

_pc = Pinecone(api_key=settings.pinecone_api_key)
_index = _pc.Index(settings.pinecone_index_name)


def upsert_review(vector_id: str, vector: list[float], metadata: dict) -> None:
    _index.upsert(vectors=[{"id": vector_id, "values": vector, "metadata": metadata}])


def delete_review(vector_id: str) -> None:
    _index.delete(ids=[vector_id])


def query(vector: list[float], top_k: int = 5) -> list[dict]:
    """질문 벡터로 유사 리뷰 top-k 검색. 메타데이터 리스트 반환."""
    res = _index.query(vector=vector, top_k=top_k, include_metadata=True)
    return [
        {"score": m["score"], **(m.get("metadata") or {})}
        for m in res.get("matches", [])
    ]
