"""AI 챗봇 '또리' — Tool Use 기반 에이전트(Agentic RAG).

고정 파이프라인(질문 임베딩 → 단발 검색 → 생성)이 아니라, Claude가 스스로
도구를 호출하며 답을 만든다:

  질문 + 대화맥락 → Claude
     ├─ search_reviews         (사내 리뷰 의미검색; 후속 질문이면 맥락 반영해 재검색)
     ├─ get_restaurant_detail  (특정 식당 깊게 확인)
     └─ recommend_restaurants  (최종 추천 확정 → 루프 종료)

도구 입력은 Anthropic이 보장하는 검증된 JSON이라, 예전의 정규식 JSON 파싱이
사라졌다. 추천 식당은 restaurant_id로 지정되어 이름 매칭도 불필요하다.

비용/품질 최적화:
- 프롬프트 캐싱: 시스템 프롬프트 + 도구 정의(고정 프리픽스)에 cache_control을
  걸어, 멀티라운드에서 반복되는 프리픽스를 캐시 읽기(~0.1x)로 처리.
- Adaptive thinking: 도구를 고르기 전에 Claude가 스스로 추론 깊이를 조절.

응답 형식은 기존과 동일한 {"answer", "restaurants"} → 프론트 무변경.
"""
from anthropic import Anthropic

from app.config import settings
from app.services import agent_tools

_client = Anthropic(api_key=settings.anthropic_api_key)

MAX_ROUNDS = 4   # 지연·비용 상한 (도구 호출 라운드)
MAX_CARDS = 5    # 카드 안전 상한
NO_PICK = "조건에 딱 맞는 곳을 찾지 못했어요. 조건을 조금 바꿔서 다시 물어봐 주세요 🌿"

SYSTEM_PROMPT = (
    "당신은 기업사업본부 사내 맛집 추천 도우미 '또리'입니다. "
    "사내 직원들이 남긴 리뷰만을 근거로 식당을 추천합니다. 리뷰·태그에 없는 내용은 "
    "절대 지어내지 마세요.\n\n"
    "[일하는 방식 — 도구 사용]\n"
    "- 추천하려면 먼저 search_reviews로 후보를 검색하세요. 사용자 조건(분위기·메뉴·"
    "가격·목적)을 자연어 query로 넘깁니다.\n"
    "- 후속 질문('거기 근처 다른 데는?', '더 조용한 곳')이면 대화 맥락을 반영해 query를 "
    "새로 구성해 다시 검색하세요.\n"
    "- 특정 식당을 깊게 확인해야 하면 get_restaurant_detail을 사용하세요.\n"
    "- search_reviews 결과가 없거나 조건에 맞지 않으면, 포기하기 전에 반드시 "
    "search_nearby_places로 광화문 일대를 실시간 검색해 새 식당을 발굴하세요. "
    "리뷰 없는 신규 식당이라도 조건에 맞으면 추천하되, answer에서 아직 사내 리뷰가 "
    "없는 곳이라는 점을 알려주세요.\n"
    "- 충분히 파악했으면 반드시 recommend_restaurants를 호출해 마무리하세요. 이때 "
    "picks에는 검색·발견·조회로 확보한 id를 그대로 넣습니다.\n\n"
    "[추천 기준]\n"
    "- 조건에 잘 맞는 곳을 보통 1~2곳만 고릅니다. 여럿이 모두 부합할 때만 그 이상(최대 5).\n"
    "- picks를 빈 배열로 두는 것은 search_reviews와 search_nearby_places를 모두 시도한 "
    "뒤에도 조건에 맞는 곳이 없을 때만 허용됩니다. 그때는 answer에서 솔직히 없다고 안내하세요."
)


def _build_response(final: dict, registry: dict[str, dict]) -> dict:
    answer_text = (final.get("answer") or "").strip() or NO_PICK
    restaurants: list[dict] = []
    for rid in final.get("picks") or []:
        card = registry.get(rid)
        if card and card not in restaurants:
            restaurants.append(card)
        if len(restaurants) >= MAX_CARDS:
            break
    return {"answer": answer_text, "restaurants": restaurants}


def answer(message: str, history: list[dict]) -> dict:
    registry: dict[str, dict] = {}  # restaurant_id → 카드 (도구가 적재, picks가 참조)

    messages: list[dict] = [
        {"role": m["role"], "content": m["content"]}
        for m in history
        if m.get("role") in ("user", "assistant")
    ]
    messages.append({"role": "user", "content": message})

    # 시스템 프롬프트에 캐시 브레이크포인트 → 도구 정의 + 시스템이 함께 캐싱됨
    system = [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]

    for _ in range(MAX_ROUNDS):
        resp = _client.messages.create(
            model=settings.claude_model,
            max_tokens=2048,
            system=system,
            tools=agent_tools.TOOLS,
            thinking={"type": "adaptive"},
            messages=messages,
        )

        if resp.stop_reason != "tool_use":
            # 도구 없이 바로 답한 경우 — 텍스트만 반환(카드 없음)
            text = "".join(b.text for b in resp.content if b.type == "text").strip()
            return {"answer": text or NO_PICK, "restaurants": []}

        # 어시스턴트 턴 전체(thinking + tool_use 블록 포함)를 그대로 이어붙임
        messages.append({"role": "assistant", "content": resp.content})

        final = None
        tool_results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            if block.name == agent_tools.FINISH_TOOL_NAME:
                final = block.input
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": "추천을 확정했습니다."}
                )
            else:
                result_text = agent_tools.dispatch(block.name, block.input, registry)
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": result_text}
                )

        messages.append({"role": "user", "content": tool_results})

        if final is not None:
            return _build_response(final, registry)

    # 라운드 상한 도달 — 마무리 도구를 못 부른 경우
    return {"answer": NO_PICK, "restaurants": []}


# ─── 스트리밍(SSE) 경로 ───
# 마무리는 select_restaurants(picks만)로 받고, 사용자 안내문은 아래 별도 스트리밍
# 호출로 토큰 단위 생성한다. 에이전트가 도구를 호출할 때마다 status 이벤트를 흘려
# "지금 무엇을 하는지"를 실시간으로 보여준다.
SYSTEM_PROMPT_STREAM = (
    "당신은 기업사업본부 사내 맛집 추천 도우미 '또리'입니다. "
    "사내 직원들이 남긴 리뷰만을 근거로 식당을 추천합니다. 리뷰·태그에 없는 내용은 "
    "절대 지어내지 마세요.\n\n"
    "[일하는 방식 — 도구 사용]\n"
    "- 추천하려면 먼저 search_reviews로 후보를 검색하세요. 사용자 조건(분위기·메뉴·"
    "가격·목적)을 자연어 query로 넘깁니다.\n"
    "- 후속 질문이면 대화 맥락을 반영해 query를 새로 구성해 다시 검색하세요.\n"
    "- 특정 식당을 깊게 확인해야 하면 get_restaurant_detail을 사용하세요.\n"
    "- search_reviews 결과가 없거나 조건에 맞지 않으면, 포기하기 전에 반드시 "
    "search_nearby_places로 광화문 일대를 실시간 검색해 새 식당을 발굴하세요. "
    "리뷰 없는 신규 식당이라도 조건에 맞으면 추천하세요.\n"
    "- 충분히 파악했으면 반드시 select_restaurants를 호출해 추천 식당 id를 확정하세요.\n\n"
    "[추천 기준]\n"
    "- 조건에 잘 맞는 곳을 보통 1~2곳만 고릅니다. 여럿이 모두 부합할 때만 그 이상(최대 5).\n"
    "- picks를 빈 배열로 두는 것은 search_reviews와 search_nearby_places를 모두 시도한 "
    "뒤에도 조건에 맞는 곳이 없을 때만 허용됩니다."
)

ANSWER_SYSTEM = (
    "당신은 사내 맛집 추천 도우미 '또리'입니다. 아래 [고른 식당]을 바탕으로 사용자에게 "
    "보여줄 안내 문장만 작성하세요.\n"
    "- 마크다운 금지(별표·샵·백틱·대시목록 금지), 평범한 한국어 1~2문장, 이모지는 한두 개만.\n"
    "- 식당 상세(별점·태그·리뷰)는 화면 카드로 따로 표시되니 반복하지 마세요.\n"
    "- 왜 골랐는지만 가볍게 안내하세요. 고른 식당이 없으면 솔직히 없다고 안내하세요.\n"
    "- '아직 사내 리뷰 없는 신규 발견 식당'이 포함되면, 그 점을 가볍게 알려주세요."
)


def _picks_summary(cards: list[dict]) -> str:
    lines = []
    for c in cards:
        cat = (c["category"] or "").split(">")[-1].strip()
        if c.get("no_review"):
            lines.append(f"- {c['name']} ({cat}) — 아직 사내 리뷰 없는 신규 발견 식당")
        else:
            tags = ", ".join(c["tags"]) or "-"
            lines.append(
                f"- {c['name']} ({cat}) 별점 {c['rating']} 태그[{tags}] 리뷰:{c['reason'] or '-'}"
            )
    return "\n".join(lines)


# 도구명 → 사용자에게 보여줄 진행 상태 문구
_STATUS = {
    "search_reviews": "🔎 동료 리뷰를 찾아보는 중…",
    "search_nearby_places": "🗺️ 광화문 일대를 둘러보는 중…",
    "get_restaurant_detail": "📋 식당을 자세히 보는 중…",
    agent_tools.SELECT_TOOL_NAME: "✨ 추천을 정리하는 중…",
}


def answer_stream(message: str, history: list[dict]):
    """에이전트 루프를 돌리며 SSE 이벤트(dict)를 순차 yield.

    이벤트: {"type":"status","text":..} / {"type":"token","text":..} /
            {"type":"done","restaurants":[..]}
    """
    registry: dict[str, dict] = {}
    messages: list[dict] = [
        {"role": m["role"], "content": m["content"]}
        for m in history
        if m.get("role") in ("user", "assistant")
    ]
    messages.append({"role": "user", "content": message})
    system = [{"type": "text", "text": SYSTEM_PROMPT_STREAM, "cache_control": {"type": "ephemeral"}}]

    picks = None
    for _ in range(MAX_ROUNDS):
        resp = _client.messages.create(
            model=settings.claude_model,
            max_tokens=2048,
            system=system,
            tools=agent_tools.STREAM_TOOLS,
            thinking={"type": "adaptive"},
            messages=messages,
        )

        if resp.stop_reason != "tool_use":
            # 도구 없이 바로 답한 경우 — 그 텍스트를 그대로 흘려보냄
            text = "".join(b.text for b in resp.content if b.type == "text").strip()
            yield {"type": "token", "text": text or NO_PICK}
            yield {"type": "done", "restaurants": []}
            return

        messages.append({"role": "assistant", "content": resp.content})
        tool_results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            yield {"type": "status", "text": _STATUS.get(block.name, "🍽️ 살펴보는 중…")}
            if block.name == agent_tools.SELECT_TOOL_NAME:
                picks = block.input.get("picks") or []
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": "추천을 확정했습니다."}
                )
            else:
                result_text = agent_tools.dispatch(block.name, block.input, registry)
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": result_text}
                )
        messages.append({"role": "user", "content": tool_results})
        if picks is not None:
            break

    if picks is None:
        yield {"type": "token", "text": NO_PICK}
        yield {"type": "done", "restaurants": []}
        return

    # picks → 카드
    restaurants: list[dict] = []
    for rid in picks:
        card = registry.get(rid)
        if card and card not in restaurants:
            restaurants.append(card)
        if len(restaurants) >= MAX_CARDS:
            break

    # 최종 안내문을 토큰 단위로 스트리밍
    user_msg = f"[질문]\n{message}\n\n[고른 식당]\n{_picks_summary(restaurants) or '없음'}"
    with _client.messages.stream(
        model=settings.claude_model,
        max_tokens=512,
        system=ANSWER_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    ) as stream:
        for text in stream.text_stream:
            yield {"type": "token", "text": text}

    yield {"type": "done", "restaurants": restaurants}
