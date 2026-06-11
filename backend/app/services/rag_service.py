"""AI 챗봇 RAG — 질문 임베딩 → Pinecone top-k 검색 → Claude 답변 생성.

리뷰 컨텍스트가 없으면 안내 문구를 그대로 반환(지어내지 않음).
"""
from anthropic import Anthropic

from app.config import settings
from app.services import embedding, pinecone_client

_client = Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = (
    "당신은 기업사업본부 사내 맛집 추천 도우미입니다. "
    "직원들이 직접 등록한 리뷰와 태그를 기반으로만 답변하세요. "
    "리뷰에 없는 내용은 절대 지어내지 마세요. "
    "추천 시 식당명, 추천 이유, 관련 리뷰 내용을 포함해 답변하세요. "
    "한국어로 친근하게 답변하세요."
)
NO_REVIEWS = "아직 등록된 리뷰가 없어요. 첫 번째 리뷰를 작성해보세요!"


def _format_context(matches: list[dict]) -> str:
    lines = []
    for m in matches:
        tags = ", ".join(m.get("tags") or [])
        lines.append(
            f"- {m.get('restaurant_name')} ({m.get('category', '')}): "
            f"별점 {m.get('rating')}, 태그 [{tags}], 리뷰: {m.get('comment', '')}"
        )
    return "\n".join(lines)


def answer(message: str, history: list[dict]) -> dict:
    matches = pinecone_client.query(embedding.embed(message), top_k=5)
    if not matches:
        return {"answer": NO_REVIEWS, "restaurants": []}

    context = _format_context(matches)
    messages = [
        {"role": m["role"], "content": m["content"]}
        for m in history
        if m["role"] in ("user", "assistant")
    ]
    messages.append(
        {"role": "user", "content": f"[등록된 리뷰]\n{context}\n\n[질문]\n{message}"}
    )

    resp = _client.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages,
    )
    text = "".join(block.text for block in resp.content if block.type == "text")

    # 참조된 식당 (중복 제거)
    seen: dict[str, str] = {}
    for m in matches:
        rid = m.get("restaurant_id")
        if rid and rid not in seen:
            seen[rid] = m.get("restaurant_name")
    restaurants = [{"id": k, "name": v} for k, v in seen.items()]

    return {"answer": text, "restaurants": restaurants}
