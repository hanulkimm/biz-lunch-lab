"""AI 챗봇 RAG — 질문 임베딩 → Pinecone top-k 검색 → Claude가 후보 중 추천 식당을 선택.

검색된 후보를 그대로 카드로 노출하지 않고, Claude가 사용자 조건에 맞는 곳만 골라
JSON(picks)으로 돌려준다. 카드는 그 선택만 표시한다(보통 1~2곳, 없으면 0곳).
리뷰 컨텍스트가 없으면 안내 문구를 그대로 반환(지어내지 않음).
"""
import json
import re

from anthropic import Anthropic

from app.config import settings
from app.services import embedding, pinecone_client

_client = Anthropic(api_key=settings.anthropic_api_key)

MAX_CARDS = 5  # 안전 상한 — 보통 Claude가 1~2곳만 고름

SYSTEM_PROMPT = (
    "당신은 기업사업본부 사내 맛집 추천 도우미 '또리'입니다. "
    "아래 후보 식당은 모두 직원들이 남긴 사내 리뷰에서 검색된 곳입니다. "
    "이 후보 중에서 사용자 조건에 실제로 맞는 곳만 골라 추천하세요. "
    "리뷰·태그에 없는 내용은 절대 지어내지 마세요.\n\n"
    "[식당 선택 규칙]\n"
    "- 조건에 잘 맞는 식당을 보통 1~2곳만 고릅니다. 여러 곳이 모두 조건에 부합할 "
    "때만 그 이상(최대 5곳)을 고를 수 있습니다.\n"
    "- 조건에 맞는 곳이 없으면 picks를 빈 배열([])로 두고, answer에서 솔직히 없다고 "
    "안내하세요(억지로 끼워 맞추지 말 것).\n"
    "- picks에는 후보 목록에 있는 식당명을 정확히 그대로 적으세요.\n\n"
    "[answer 작성 규칙]\n"
    "- 마크다운을 절대 쓰지 마세요(별표·샵·백틱·대시 목록 금지).\n"
    "- 평범한 1~2문장 한국어로, 식당을 길게 나열하지 말고 왜 골랐는지만 가볍게 안내하세요.\n"
    "- 식당 상세(별점·태그·리뷰)는 화면 카드로 따로 표시되니 answer에서 반복하지 마세요.\n"
    "- 이모지는 한두 개만 가볍게 사용하세요.\n\n"
    "반드시 아래 JSON 형식으로만 응답하세요(코드펜스·설명 없이 JSON만):\n"
    '{"answer": "사용자에게 보여줄 안내 문장", "picks": ["식당명1", "식당명2"]}'
)
NO_REVIEWS = "아직 등록된 리뷰가 없어요. 첫 번째 리뷰를 작성해보세요!"


def _aggregate_candidates(matches: list[dict]) -> dict[str, dict]:
    """검색 매치를 식당 단위 카드로 집계. 이름→카드 (Pinecone 관련도 순서 유지)."""
    agg: dict[str, dict] = {}
    for m in matches:
        name = m.get("restaurant_name")
        rid = m.get("restaurant_id")
        if not name or not rid:
            continue
        if name not in agg:
            agg[name] = {
                "id": rid,
                "name": name,
                "category": m.get("category") or "",
                "address": m.get("address") or "",
                "_ratings": [],
                "tags": [],
                "reason": "",
            }
        card = agg[name]
        if m.get("rating") is not None:
            card["_ratings"].append(m["rating"])
        for t in m.get("tags") or []:
            if t and t not in card["tags"]:
                card["tags"].append(t)
        if not card["reason"] and (m.get("comment") or "").strip():
            card["reason"] = m["comment"].strip()

    for card in agg.values():
        ratings = card.pop("_ratings")
        card["rating"] = round(sum(ratings) / len(ratings), 1) if ratings else None
        card["tags"] = card["tags"][:4]
    return agg


def _candidate_list(candidates: dict[str, dict]) -> str:
    lines = []
    for i, c in enumerate(candidates.values(), start=1):
        tags = ", ".join(c["tags"]) or "-"
        cat = (c["category"] or "").split(">")[-1].strip()
        lines.append(
            f"{i}. {c['name']} ({cat}) — 별점 {c['rating']}, 태그 [{tags}], "
            f"리뷰: {c['reason'] or '-'}"
        )
    return "\n".join(lines)


def _parse_json(text: str) -> dict | None:
    """Claude 응답에서 JSON 객체 추출(코드펜스/잡설 섞여도 첫 객체를 잡는다)."""
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
    return None


def answer(message: str, history: list[dict]) -> dict:
    matches = pinecone_client.query(embedding.embed(message), top_k=6)
    if not matches:
        return {"answer": NO_REVIEWS, "restaurants": []}

    candidates = _aggregate_candidates(matches)
    messages = [
        {"role": m["role"], "content": m["content"]}
        for m in history
        if m["role"] in ("user", "assistant")
    ]
    messages.append(
        {"role": "user", "content": f"[후보 식당]\n{_candidate_list(candidates)}\n\n[질문]\n{message}"}
    )

    resp = _client.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages,
    )
    raw = "".join(block.text for block in resp.content if block.type == "text")
    parsed = _parse_json(raw)

    # Claude가 고른 식당만 카드로 (이름 정확 매칭, picks 순서 유지)
    if parsed and isinstance(parsed.get("answer"), str):
        answer_text = parsed["answer"].strip()
        restaurants = []
        for name in parsed.get("picks") or []:
            card = candidates.get(name)
            if card and card not in restaurants:
                restaurants.append(card)
            if len(restaurants) >= MAX_CARDS:
                break
    else:
        # JSON 파싱 실패 시 폴백: 원문 텍스트 + 상위 1곳만
        answer_text = raw.strip()
        restaurants = list(candidates.values())[:1]

    return {"answer": answer_text, "restaurants": restaurants}
