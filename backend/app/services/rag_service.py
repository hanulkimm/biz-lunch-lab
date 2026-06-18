"""AI 챗봇 RAG — 질문 임베딩 → Pinecone top-k 검색 → Claude 답변 생성.

리뷰 컨텍스트가 없으면 안내 문구를 그대로 반환(지어내지 않음).
"""
from anthropic import Anthropic

from app.config import settings
from app.services import embedding, pinecone_client

_client = Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = (
    "당신은 기업사업본부 사내 맛집 추천 도우미 '또리'입니다. "
    "직원들이 직접 등록한 리뷰와 태그만 근거로 답변하고, "
    "리뷰에 없는 내용은 절대 지어내지 마세요.\n\n"
    "답변 형식 규칙:\n"
    "- 마크다운을 절대 쓰지 마세요. 별표(**, *), 샵(#), 백틱(`), 대시(-)로 시작하는 "
    "목록 등 어떤 마크다운 기호도 사용하지 마세요.\n"
    "- 추천 식당의 상세 정보(이름·별점·태그·리뷰)는 화면에 카드로 따로 표시됩니다. "
    "그러니 답변 글에서는 식당을 길게 나열하지 말고, 1~2문장으로 짧고 친근하게 "
    "왜 이런 곳들을 골랐는지만 가볍게 안내하세요.\n"
    "- 예: '회의 전에 빨리 먹기 좋은 곳들로 골라봤어요!' 처럼 가볍게 한국어로.\n"
    "- 적합한 식당이 없으면 솔직하게 없다고 말하고 리뷰 등록을 권해주세요.\n"
    "- 이모지는 한두 개만 가볍게 사용하세요."
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

    # 참조된 식당을 카드용으로 집계 (Pinecone 관련도 순서 유지, 상위 N곳)
    MAX_CARDS = 3
    agg: dict[str, dict] = {}
    order: list[str] = []
    for m in matches:
        rid = m.get("restaurant_id")
        if not rid:
            continue
        if rid not in agg:
            agg[rid] = {
                "id": rid,
                "name": m.get("restaurant_name"),
                "category": m.get("category") or "",
                "address": m.get("address") or "",
                "_ratings": [],
                "tags": [],
                "reason": "",
            }
            order.append(rid)
        card = agg[rid]
        if m.get("rating") is not None:
            card["_ratings"].append(m["rating"])
        for t in m.get("tags") or []:
            if t and t not in card["tags"]:
                card["tags"].append(t)
        if not card["reason"] and (m.get("comment") or "").strip():
            card["reason"] = m["comment"].strip()

    restaurants = []
    for rid in order[:MAX_CARDS]:
        card = agg[rid]
        ratings = card.pop("_ratings")
        card["rating"] = round(sum(ratings) / len(ratings), 1) if ratings else None
        card["tags"] = card["tags"][:4]
        restaurants.append(card)

    return {"answer": text, "restaurants": restaurants}
