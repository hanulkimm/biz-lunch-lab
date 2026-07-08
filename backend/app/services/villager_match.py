"""닮은꼴 주민 매칭 — 퀴즈 스코어링 + Claude Vision 최종 선택.

흐름:
  1) 퀴즈 답변으로 주민 413명 전원을 점수화 → 상위 후보 12명 추출
  2) Claude에게 (선택) 사용자 사진 + 후보 프로필을 주고 최종 1명 + 러너업 2명을
     고르게 함 (tool_choice 강제 → 검증된 JSON 입력)
  3) Claude 호출 실패 시 점수 1위로 폴백 (기능이 죽지 않게)

개인정보: 사진은 요청 처리 중 메모리에서만 사용하고 어디에도 저장하지 않는다.
"""
import base64
import json
import random
from pathlib import Path

from anthropic import Anthropic

from app.config import settings

_client = Anthropic(api_key=settings.anthropic_api_key)

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "villagers.json"
VILLAGERS: list[dict] = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
_BY_ID = {v["id"]: v for v in VILLAGERS}

CANDIDATES = 12          # Claude에게 넘길 후보 수
MAX_SCORE = 31           # 스코어링 만점 (폴백 퍼센트 계산용)

# ─── 퀴즈 → 성격 8유형 점수 매핑 ───
# vibe1: 점심시간을 보내는 방식 / vibe2: 회사에서의 이미지
_VIBE1 = {
    "active":  {"Jock": 2, "Big Sister": 1},      # 헬스장/산책
    "solo":    {"Lazy": 2, "Cranky": 1},          # 혼밥+유튜브
    "social":  {"Peppy": 2, "Normal": 1},         # 동료들과 수다
    "cafe":    {"Snooty": 2, "Smug": 1},          # 카페에서 여유
}
_VIBE2 = {
    "tsundere":  {"Cranky": 2, "Big Sister": 1},  # 츤데레 정 많은 선배
    "insider":   {"Peppy": 2, "Jock": 1},         # 인싸 에너지 담당
    "counselor": {"Normal": 2, "Lazy": 1},        # 다정한 상담사
    "pro":       {"Smug": 2, "Snooty": 1},        # 자기관리 철저한 프로
}


def _personality_points(quiz: dict) -> dict[str, int]:
    pts: dict[str, int] = {}
    for table, key in ((_VIBE1, "vibe1"), (_VIBE2, "vibe2")):
        for p, n in table.get(quiz.get(key, ""), {}).items():
            pts[p] = pts.get(p, 0) + n
    return pts


def score_villagers(quiz: dict) -> list[tuple[int, dict]]:
    """전체 주민을 퀴즈 답변으로 점수화해 내림차순 정렬."""
    p_pts = _personality_points(quiz)
    month, day = quiz.get("birth_month"), quiz.get("birth_day")

    scored = []
    for v in VILLAGERS:
        s = p_pts.get(v["personality"], 0) * 3               # 성격 0~12
        if quiz.get("hobby") == v["hobby"]:
            s += 5
        if quiz.get("color") in v["colors"]:
            s += 4
        if quiz.get("style") in v["styles"]:
            s += 4
        if month and day:
            if v["birth_month"] == month and v["birth_day"] == day:
                s += 6
            elif v["birth_month"] == month:
                s += 3
        scored.append((s, v))

    random.shuffle(scored)  # 동점자 순서 고정 방지 (매번 같은 주민 방지)
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored


def _candidate_sheet(cands: list[tuple[int, dict]]) -> str:
    lines = []
    for s, v in cands:
        lines.append(
            f"- id:{v['id']} | {v['name_ko']}({v['name']}) | {v['species_ko']} "
            f"{'남' if v['gender'] == 'Male' else '여'} | 성격:{v['personality_ko']} "
            f"| 취미:{v['hobby_ko']} | 색:{','.join(v['colors'])} "
            f"| 스타일:{','.join(v['styles'])} | 말버릇:'{v['catchphrase_ko']}' "
            f"| 퀴즈점수:{s}"
        )
    return "\n".join(lines)


_PICK_TOOL = {
    "name": "pick_villager",
    "description": "후보 중 사용자와 가장 닮은 주민 1명과 러너업 2명을 확정한다.",
    "input_schema": {
        "type": "object",
        "properties": {
            "pick_id": {"type": "string", "description": "최종 선택한 주민의 id"},
            "runner_up_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "아쉽게 2·3위인 주민 id 두 개",
            },
            "match_percent": {
                "type": "integer",
                "description": "싱크로율 60~99. 사진·퀴즈가 잘 맞을수록 높게.",
            },
            "reason": {
                "type": "string",
                "description": (
                    "닮은 이유 2~3문장, 한국어. 사진이 있으면 사진에서 본 인상"
                    "(표정·분위기·스타일)을 꼭 언급하고, 퀴즈 답변 근거도 곁들인다. "
                    "따뜻하고 장난스러운 동물의 숲 말투. 마크다운 금지."
                ),
            },
        },
        "required": ["pick_id", "runner_up_ids", "match_percent", "reason"],
    },
}

_SYSTEM = (
    "당신은 '동물의 숲' 주민 감정사입니다. 사용자와 가장 닮은 주민을 찾아줍니다.\n"
    "- 사진이 주어지면: 얼굴 생김새를 평가하는 게 아니라, 전체적인 인상·표정·분위기·"
    "헤어/패션 톤을 후보 주민의 종·성격·색·스타일과 연결하세요.\n"
    "- 사진이 없으면 퀴즈 답변(성격·취미·색·스타일·생일)만으로 고르세요.\n"
    "- 퀴즈점수는 참고용입니다. 사진 인상이 강하게 맞으면 점수 낮은 후보를 골라도 됩니다.\n"
    "- 외모 평가·나이/성별 단정 등 불쾌할 수 있는 표현은 금지. 유쾌하고 기분 좋게.\n"
    "- 반드시 pick_villager 도구를 호출해 확정하세요."
)


def _quiz_summary(quiz: dict) -> str:
    parts = []
    if quiz.get("birth_month") and quiz.get("birth_day"):
        parts.append(f"생일 {quiz['birth_month']}월 {quiz['birth_day']}일")
    labels = {
        "vibe1": {"active": "점심시간에 운동/산책", "solo": "점심은 조용히 혼밥",
                  "social": "점심시간 수다 풀코스", "cafe": "카페에서 여유"},
        "vibe2": {"tsundere": "츤데레 정 많은 선배", "insider": "인싸 에너지 담당",
                  "counselor": "다정한 상담사", "pro": "자기관리 철저한 프로"},
    }
    for k in ("vibe1", "vibe2"):
        if quiz.get(k) in labels[k]:
            parts.append(labels[k][quiz[k]])
    for k, name in (("hobby", "취미"), ("color", "좋아하는 색"), ("style", "스타일")):
        if quiz.get(k):
            parts.append(f"{name}: {quiz[k]}")
    return " / ".join(parts) or "(응답 없음)"


def _card(v: dict) -> dict:
    """프론트 결과 카드에 필요한 필드만."""
    return {
        "id": v["id"], "name": v["name"], "name_ko": v["name_ko"],
        "species_ko": v["species_ko"], "personality_ko": v["personality_ko"],
        "hobby_ko": v["hobby_ko"],
        "birthday": f"{v['birth_month']}월 {v['birth_day']}일",
        "catchphrase_ko": v["catchphrase_ko"], "icon": v["icon"], "photo": v["photo"],
        "bubble_color": v["bubble_color"], "name_color": v["name_color"],
    }


def _fallback(scored: list[tuple[int, dict]]) -> dict:
    """Claude 호출 실패 시 — 점수 1위로 결정."""
    top_score, top = scored[0]
    percent = min(99, 60 + round(top_score / MAX_SCORE * 39))
    return {
        "villager": _card(top),
        "match_percent": percent,
        "reason": (
            f"{top['name_ko']}와(과) 취향이 꼭 닮았어요! "
            f"{top['personality_ko']} 스타일에 {top['hobby_ko']}을(를) 좋아하는 점까지, "
            f"'{top['catchphrase_ko']}' 하고 인사를 건넬 것 같아요."
        ),
        "runner_ups": [
            {"id": v["id"], "name_ko": v["name_ko"], "icon": v["icon"]}
            for _, v in scored[1:3]
        ],
        "photo_used": False,
    }


def match(quiz: dict, photo: bytes | None = None, media_type: str | None = None) -> dict:
    scored = score_villagers(quiz)
    cands = scored[:CANDIDATES]

    content: list[dict] = []
    if photo:
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type or "image/jpeg",
                    "data": base64.standard_b64encode(photo).decode(),
                },
            }
        )
    content.append(
        {
            "type": "text",
            "text": (
                f"[사용자 퀴즈 답변]\n{_quiz_summary(quiz)}\n\n"
                f"[후보 주민 {len(cands)}명]\n{_candidate_sheet(cands)}\n\n"
                + ("첨부한 사진의 인상을 함께 고려해 " if photo else "")
                + "가장 닮은 주민을 골라주세요."
            ),
        }
    )

    try:
        resp = _client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            system=_SYSTEM,
            tools=[_PICK_TOOL],
            tool_choice={"type": "tool", "name": "pick_villager"},
            messages=[{"role": "user", "content": content}],
        )
        picked = next(b.input for b in resp.content if b.type == "tool_use")
    except Exception:
        return _fallback(scored)

    pick = _BY_ID.get(picked.get("pick_id"))
    if pick is None:  # 목록 밖 id를 내면 폴백
        return _fallback(scored)

    runner_ups = [
        {"id": v["id"], "name_ko": v["name_ko"], "icon": v["icon"]}
        for rid in (picked.get("runner_up_ids") or [])[:2]
        if (v := _BY_ID.get(rid)) and rid != pick["id"]
    ]
    percent = max(60, min(99, int(picked.get("match_percent", 80))))

    return {
        "villager": _card(pick),
        "match_percent": percent,
        "reason": (picked.get("reason") or "").strip() or "취향이 꼭 닮은 주민이에요!",
        "runner_ups": runner_ups,
        "photo_used": photo is not None,
    }
