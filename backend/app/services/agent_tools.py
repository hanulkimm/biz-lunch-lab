"""또리 AI 에이전트의 도구(Tool Use) 정의 + 핸들러.

고정 파이프라인(retrieve→generate)을 에이전트로 격상하면서, Claude가 스스로
판단해 호출하는 도구들을 정의한다. 각 핸들러는 결과를 텍스트로 돌려주고,
조회한 식당을 `registry`(id→카드)에 적재한다. 최종 추천(`recommend_restaurants`)은
이 registry의 id를 참조하므로 이름 매칭/정규식 파싱이 필요 없다.

- search_reviews        : 사내 리뷰 의미검색 (OpenAI 임베딩 → Pinecone)
- get_restaurant_detail : 특정 식당의 전체 리뷰·태그 조회 (Supabase)
- recommend_restaurants : 최종 추천 확정(finish) — 구조화 출력으로 정규식 파싱 대체
"""
from app.database import supabase
from app.services import embedding, kakao, pinecone_client

# ─── 도구 스키마 (Anthropic Tool Use) ───
SEARCH_REVIEWS_TOOL = {
    "name": "search_reviews",
    "description": (
        "사내 직원들이 남긴 식당 리뷰를 의미 기반으로 검색한다. "
        "사용자의 조건(분위기·메뉴·가격·목적 등)을 자연어 query로 넘기면 "
        "의미가 가까운 리뷰의 식당 후보를 별점·태그·리뷰와 함께 돌려준다. "
        "추천을 하려면 먼저 이 도구로 후보를 확보해야 한다. 후속 질문이면 "
        "대화 맥락을 반영해 query를 새로 작성하라."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "검색할 조건을 담은 자연어 문장 (예: '조용하고 룸 있는 상급자 회식 한식집')",
            },
            "top_k": {
                "type": "integer",
                "description": "가져올 후보 수 (기본 8, 최대 12)",
            },
        },
        "required": ["query"],
    },
}

GET_RESTAURANT_DETAIL_TOOL = {
    "name": "get_restaurant_detail",
    "description": (
        "특정 식당의 전체 리뷰·태그·평균 별점을 자세히 조회한다. "
        "search_reviews 결과로 받은 restaurant_id를 넘긴다. "
        "'그 집 룸 있어?', '리뷰 더 보여줘'처럼 한 식당을 깊게 확인할 때 사용한다."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "restaurant_id": {
                "type": "string",
                "description": "search_reviews가 돌려준 후보의 id",
            },
        },
        "required": ["restaurant_id"],
    },
}

SEARCH_NEARBY_PLACES_TOOL = {
    "name": "search_nearby_places",
    "description": (
        "광화문 권역의 음식점·카페를 카카오 지도에서 실시간 검색한다. "
        "사내 리뷰(search_reviews)에 조건에 맞는 곳이 마땅치 않을 때, 아직 리뷰가 "
        "없는 새 식당까지 발견해 추천하기 위해 사용한다. 결과에는 '아직 리뷰 없음' "
        "식당이 포함되며, 그런 곳을 추천할 땐 리뷰가 없다는 점을 사용자에게 알려야 한다."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "검색 키워드 (예: '국밥', '파스타', '돈까스')",
            },
        },
        "required": ["query"],
    },
}

RECOMMEND_RESTAURANTS_TOOL = {
    "name": "recommend_restaurants",
    "description": (
        "사용자에게 보여줄 최종 답변과 추천 식당을 확정한다. "
        "검색·확인이 끝나면 반드시 이 도구를 호출해 마무리한다. "
        "조건에 맞는 곳이 없으면 picks를 빈 배열로 두고 answer에서 솔직히 안내한다."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "answer": {
                "type": "string",
                "description": (
                    "사용자에게 보여줄 안내 문장. 마크다운 금지(별표·샵·백틱·대시목록 금지), "
                    "평범한 한국어 1~2문장, 이모지는 한두 개만. 식당 상세(별점·태그)는 "
                    "카드로 따로 표시되니 반복하지 말 것."
                ),
            },
            "picks": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "추천하는 식당의 restaurant_id 목록(검색·조회로 확보한 id 그대로). "
                    "보통 1~2개, 모두 조건에 맞을 때만 그 이상(최대 5). 없으면 빈 배열."
                ),
            },
        },
        "required": ["answer", "picks"],
    },
}

# 스트리밍 경로용 finish 도구 — 안내문은 별도 스트리밍 호출로 생성하므로 picks만 받는다.
SELECT_RESTAURANTS_TOOL = {
    "name": "select_restaurants",
    "description": (
        "검색·확인이 끝나면 호출해 최종 추천 식당을 확정한다(마무리). "
        "조건에 맞는 곳이 없으면 picks를 빈 배열로 둔다."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "picks": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "추천 식당의 restaurant_id 목록(검색·조회로 확보한 id 그대로, "
                    "보통 1~2개·최대 5, 없으면 빈 배열)"
                ),
            },
        },
        "required": ["picks"],
    },
}

# 비스트리밍 경로: 안내문+picks를 한 번에 확정
TOOLS = [
    SEARCH_REVIEWS_TOOL,
    SEARCH_NEARBY_PLACES_TOOL,
    GET_RESTAURANT_DETAIL_TOOL,
    RECOMMEND_RESTAURANTS_TOOL,
]
FINISH_TOOL_NAME = "recommend_restaurants"

# 스트리밍 경로: 검색·조회는 공유, 마무리는 picks만 받는 select_restaurants
STREAM_TOOLS = [
    SEARCH_REVIEWS_TOOL,
    SEARCH_NEARBY_PLACES_TOOL,
    GET_RESTAURANT_DETAIL_TOOL,
    SELECT_RESTAURANTS_TOOL,
]
SELECT_TOOL_NAME = "select_restaurants"


# ─── 카드 집계 (프론트 카드 형태 그대로 유지) ───
def _aggregate_candidates(matches: list[dict]) -> dict[str, dict]:
    """Pinecone 매치를 식당 단위 카드로 집계. id→카드 (관련도 순서 유지)."""
    agg: dict[str, dict] = {}
    for m in matches:
        name = m.get("restaurant_name")
        rid = m.get("restaurant_id")
        if not name or not rid:
            continue
        if rid not in agg:
            agg[rid] = {
                "id": rid,
                "name": name,
                "category": m.get("category") or "",
                "address": m.get("address") or "",
                "_ratings": [],
                "tags": [],
                "reason": "",
            }
        card = agg[rid]
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


def _card_line(card: dict) -> str:
    tags = ", ".join(card["tags"]) or "-"
    cat = (card["category"] or "").split(">")[-1].strip()
    return (
        f"- id: {card['id']} | {card['name']} ({cat}) — 별점 {card['rating']}, "
        f"태그 [{tags}], 리뷰: {card['reason'] or '-'}"
    )


# ─── 도구 핸들러 ───
def _handle_search_reviews(args: dict, registry: dict[str, dict]) -> str:
    query = (args.get("query") or "").strip()
    if not query:
        return "query가 비어 있습니다. 검색할 조건을 문장으로 넘기세요."
    top_k = args.get("top_k") or 8
    top_k = max(1, min(int(top_k), 12))

    matches = pinecone_client.query(embedding.embed(query), top_k=top_k)
    if not matches:
        return "검색 결과가 없습니다. 아직 등록된 리뷰가 적을 수 있습니다."

    candidates = _aggregate_candidates(matches)
    for rid, card in candidates.items():
        registry[rid] = card  # 최종 picks가 참조할 카드 등록
    lines = [_card_line(c) for c in candidates.values()]
    return "후보 식당:\n" + "\n".join(lines)


def _handle_get_restaurant_detail(args: dict, registry: dict[str, dict]) -> str:
    rid = (args.get("restaurant_id") or "").strip()
    if not rid:
        return "restaurant_id가 비어 있습니다."

    res = (
        supabase.table("restaurants")
        .select("id, name, category, address, reviews(rating, comment, review_tags(tags(name)))")
        .eq("id", rid)
        .limit(1)
        .execute()
    )
    if not res.data:
        return f"id {rid} 식당을 찾을 수 없습니다."

    row = res.data[0]
    reviews = row.get("reviews") or []
    ratings = [r["rating"] for r in reviews if r.get("rating") is not None]
    avg = round(sum(ratings) / len(ratings), 1) if ratings else None
    tags: list[str] = []
    for r in reviews:
        for rt in r.get("review_tags") or []:
            name = ((rt.get("tags") or {}).get("name") or "").strip()
            if name and name not in tags:
                tags.append(name)
    comments = [(r.get("comment") or "").strip() for r in reviews if (r.get("comment") or "").strip()]

    # 최종 picks가 참조할 수 있도록 registry에도 카드 등록
    registry[rid] = {
        "id": rid,
        "name": row.get("name") or "",
        "category": row.get("category") or "",
        "address": row.get("address") or "",
        "rating": avg,
        "tags": tags[:4],
        "reason": comments[0] if comments else "",
    }

    cat = (row.get("category") or "").split(">")[-1].strip()
    lines = [
        f"{row.get('name')} ({cat}) — 평균 별점 {avg}, 리뷰 {len(reviews)}개",
        f"태그: {', '.join(tags) or '-'}",
    ]
    if comments:
        lines.append("리뷰:")
        lines.extend(f"- {c}" for c in comments[:5])
    return "\n".join(lines)


def _handle_search_nearby_places(args: dict, registry: dict[str, dict]) -> str:
    query = (args.get("query") or "").strip()
    if not query:
        return "query가 비어 있습니다. 검색할 키워드를 넘기세요."
    try:
        places = kakao.search_keyword(query, size=8)
    except Exception as exc:
        return f"카카오 검색 오류: {exc}"
    if not places:
        return "광화문 권역에서 검색 결과가 없습니다."

    # 이미 사내에 등록된 식당(리뷰 있음) 매핑: kakao_place_id → restaurant_id
    kids = [p["kakao_place_id"] for p in places]
    existing: dict[str, str] = {}
    try:
        rows = (
            supabase.table("restaurants")
            .select("id, kakao_place_id")
            .in_("kakao_place_id", kids)
            .execute()
            .data
        )
        existing = {r["kakao_place_id"]: r["id"] for r in rows}
    except Exception:
        existing = {}

    lines = []
    for p in places:
        kid = p["kakao_place_id"]
        cat = (p.get("category") or "").split(">")[-1].strip()
        addr = p.get("road_address") or p.get("address") or ""
        if kid in existing:  # 이미 사내 등록 — 리뷰는 get_restaurant_detail로
            rid = existing[kid]
            registry.setdefault(
                rid,
                {"id": rid, "name": p["name"], "category": p.get("category") or "",
                 "address": addr, "rating": None, "tags": [], "reason": ""},
            )
            lines.append(f"- id: {rid} | {p['name']} ({cat}) — 이미 사내 등록됨")
        else:  # 신규 발견(리뷰 없음) — 카드에 지도 포커스용 좌표/카카오정보 포함
            registry[kid] = {
                "id": kid,
                "kakao_place_id": kid,
                "name": p["name"],
                "category": p.get("category") or "",
                "address": addr,
                "road_address": p.get("road_address") or "",
                "latitude": p.get("latitude"),
                "longitude": p.get("longitude"),
                "kakao_url": p.get("kakao_url") or "",
                "rating": None,
                "tags": [],
                "reason": "",
                "no_review": True,
            }
            lines.append(f"- id: {kid} | {p['name']} ({cat}) — 아직 리뷰 없음(신규 발견)")

    return (
        "광화문 권역 검색 결과(카카오):\n" + "\n".join(lines) +
        "\n\n참고: '아직 리뷰 없음'은 사내 검증이 없는 곳이니, 추천 시 answer에서 "
        "리뷰가 없다는 점을 알려라."
    )


# 도구 이름 → 핸들러
_HANDLERS = {
    "search_reviews": _handle_search_reviews,
    "search_nearby_places": _handle_search_nearby_places,
    "get_restaurant_detail": _handle_get_restaurant_detail,
}


def dispatch(name: str, args: dict, registry: dict[str, dict]) -> str:
    """도구 호출을 실행하고 결과 텍스트를 반환. (recommend_restaurants는 루프에서 직접 처리)"""
    handler = _HANDLERS.get(name)
    if handler is None:
        return f"알 수 없는 도구입니다: {name}"
    try:
        return handler(args, registry)
    except Exception as exc:  # 도구 실패는 모델이 복구할 수 있게 메시지로 전달
        return f"도구 실행 중 오류: {exc}"
