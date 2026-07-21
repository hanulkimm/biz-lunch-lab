"""랜덤 런치 매칭 — 신청자 취향을 Claude로 분석해 4~6인 그룹 + 식당 추천.

Claude는 JSON으로 그룹을 돌려주고, 여기서 멤버명→user_id / 식당명→restaurant_id로
매핑해 Supabase(lunch_matches / _members / _restaurants)에 적재한다.
JSON 파싱 실패에 대비해 폴백(취향 무관 균등 분할)을 둔다.
"""
import json
import re

from anthropic import Anthropic

from app.config import settings
from app.database import supabase

_client = Anthropic(api_key=settings.anthropic_api_key)

PROMPT_TEMPLATE = """다음은 랜덤 런치 신청자 목록과 각자의 취향입니다.
신청자들을 4~6인 그룹으로 최대한 균등하게 나눠주세요.
취향(음식 선호, 기피 음식, 분위기)이 비슷한 사람끼리 같은 그룹이 되도록 구성하고,
각 그룹에 적합한 식당을 아래 등록된 식당 목록에서만 골라 1~2곳 추천해주세요.
(목록에 없는 식당은 추천하지 마세요. 식당명은 목록의 이름을 정확히 그대로 쓰세요.)

[신청자 목록]
{applicants}

[등록된 식당 리뷰 요약]
{restaurants}

반드시 아래 JSON 형식으로만 응답하세요(설명 문장 없이 JSON만):
{{
  "groups": [
    {{
      "group_no": 1,
      "members": ["이름1", "이름2"],
      "recommended_restaurants": [
        {{"name": "식당명", "reason": "추천 이유"}}
      ]
    }}
  ]
}}"""


def _applicants_for_round(round_id: str) -> list[dict]:
    """신청자 + 유저명/팀명/취향."""
    rows = (
        supabase.table("lunch_applications")
        .select(
            "id, user_id, food_preferences, food_exclusions, atmosphere_pref, "
            "users(name, team_name, teams(name))"
        )
        .eq("round_id", round_id)
        .execute()
        .data
    )
    out = []
    for r in rows:
        user = r.get("users") or {}
        team = user.get("team_name") or (user.get("teams") or {}).get("name", "")
        out.append(
            {
                "user_id": r["user_id"],
                "name": user.get("name", ""),
                "team": team,
                "food_preferences": r.get("food_preferences") or [],
                "food_exclusions": r.get("food_exclusions") or "",
                "atmosphere_pref": r.get("atmosphere_pref") or "상관없음",
            }
        )
    return out


def _restaurant_summaries() -> list[dict]:
    """리뷰가 있는 식당 — 이름/카테고리/평균별점/태그 요약 (Claude 컨텍스트용)."""
    rows = (
        supabase.table("restaurants")
        .select(
            "id, name, category, "
            "reviews(rating, review_tags(tags(name)))"
        )
        .execute()
        .data
    )
    out = []
    for row in rows:
        reviews = row.get("reviews") or []
        if not reviews:
            continue
        ratings = [rv["rating"] for rv in reviews]
        tags = sorted(
            {
                t["tags"]["name"]
                for rv in reviews
                for t in (rv.get("review_tags") or [])
                if t.get("tags")
            }
        )
        out.append(
            {
                "id": row["id"],
                "name": row["name"],
                "category": (row.get("category") or "").split(">")[-1].strip(),
                "avg_rating": round(sum(ratings) / len(ratings), 1),
                "review_count": len(ratings),
                "tags": tags,
            }
        )
    return out


def _format_applicants(applicants: list[dict]) -> str:
    lines = []
    for a in applicants:
        prefs = ", ".join(a["food_preferences"]) or "없음"
        excl = a["food_exclusions"] or "없음"
        lines.append(
            f"- {a['name']}({a['team']}): 선호 [{prefs}], "
            f"기피 [{excl}], 분위기 [{a['atmosphere_pref']}]"
        )
    return "\n".join(lines)


def _format_restaurants(restaurants: list[dict]) -> str:
    if not restaurants:
        return "(아직 등록된 식당이 없습니다 — 추천은 비워두세요)"
    lines = []
    for r in restaurants:
        tags = ", ".join(r["tags"]) or "-"
        lines.append(
            f"- {r['name']} ({r['category']}): 별점 {r['avg_rating']}, 태그 [{tags}]"
        )
    return "\n".join(lines)


def _parse_groups(text: str) -> list[dict]:
    """Claude 응답에서 JSON 추출. 코드펜스/잡설 섞여도 첫 JSON 객체를 잡는다."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.MULTILINE).strip()
    try:
        return json.loads(text).get("groups", [])
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0)).get("groups", [])
        except json.JSONDecodeError:
            pass
    return []


def _fallback_groups(applicants: list[dict]) -> list[dict]:
    """Claude 실패 시 — 취향 무시하고 4~6인으로 균등 분할."""
    n = len(applicants)
    # 그룹 수: 5인 기준으로 올림, 최소 1
    g = max(1, round(n / 5))
    groups = []
    for i in range(g):
        members = [a["name"] for a in applicants[i::g]]
        if members:
            groups.append(
                {"group_no": i + 1, "members": members, "recommended_restaurants": []}
            )
    return groups


def run_match(round_id: str) -> dict:
    """회차의 신청자를 매칭해 결과를 적재하고 회차를 matched로 전환. 결과 반환."""
    applicants = _applicants_for_round(round_id)
    if len(applicants) < 2:
        raise ValueError("매칭하려면 신청자가 2명 이상이어야 합니다.")

    restaurants = _restaurant_summaries()
    name_to_uid = {a["name"]: a["user_id"] for a in applicants}
    name_to_rid = {r["name"]: r["id"] for r in restaurants}

    # Claude 호출 (실패 시 폴백)
    try:
        prompt = PROMPT_TEMPLATE.format(
            applicants=_format_applicants(applicants),
            restaurants=_format_restaurants(restaurants),
        )
        resp = _client.messages.create(
            model=settings.claude_model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in resp.content if b.type == "text")
        groups = _parse_groups(text)
    except Exception as e:  # API 장애
        print(f"[lunch match] Claude 호출 실패, 폴백 사용: {e}")
        groups = []

    if not groups:
        groups = _fallback_groups(applicants)

    # 기존 매칭 정리 (재실행 대비) — 자식부터 삭제
    old = supabase.table("lunch_matches").select("id").eq("round_id", round_id).execute().data
    for m in old:
        supabase.table("lunch_match_restaurants").delete().eq("match_id", m["id"]).execute()
        supabase.table("lunch_match_members").delete().eq("match_id", m["id"]).execute()
    supabase.table("lunch_matches").delete().eq("round_id", round_id).execute()

    # 적재
    assigned: set[str] = set()
    for idx, grp in enumerate(groups, start=1):
        match = (
            supabase.table("lunch_matches")
            .insert({"round_id": round_id, "group_no": idx})
            .execute()
            .data[0]
        )
        # 멤버 (이름→user_id, 중복/미존재 제외)
        members = []
        for name in grp.get("members", []):
            uid = name_to_uid.get(name)
            if uid and uid not in assigned:
                members.append({"match_id": match["id"], "user_id": uid})
                assigned.add(uid)
        if members:
            supabase.table("lunch_match_members").insert(members).execute()

        # 추천 식당 (이름→restaurant_id, 목록에 있는 것만)
        recs = []
        for order, rec in enumerate(grp.get("recommended_restaurants", []), start=1):
            rid = name_to_rid.get(rec.get("name"))
            if rid:
                recs.append(
                    {
                        "match_id": match["id"],
                        "restaurant_id": rid,
                        "reason": rec.get("reason"),
                        "sort_order": order,
                    }
                )
        if recs:
            supabase.table("lunch_match_restaurants").insert(recs).execute()

    # 미배정자 보정 — 첫 그룹에 합류시켜 누락 방지
    leftover = [a["user_id"] for a in applicants if a["user_id"] not in assigned]
    if leftover:
        first = (
            supabase.table("lunch_matches")
            .select("id")
            .eq("round_id", round_id)
            .order("group_no")
            .limit(1)
            .execute()
            .data
        )
        if first:
            supabase.table("lunch_match_members").insert(
                [{"match_id": first[0]["id"], "user_id": uid} for uid in leftover]
            ).execute()

    supabase.table("lunch_rounds").update({"status": "matched"}).eq("id", round_id).execute()
    return get_result(round_id)


def get_result(round_id: str) -> dict:
    """회차 매칭 결과 — 그룹별 멤버(이름/팀) + 추천 식당."""
    matches = (
        supabase.table("lunch_matches")
        .select(
            "id, group_no, "
            "lunch_match_members(users(id, name, team_name, teams(name))), "
            "lunch_match_restaurants(reason, sort_order, restaurants(id, name, category))"
        )
        .eq("round_id", round_id)
        .order("group_no")
        .execute()
        .data
    )
    groups = []
    for m in matches:
        members = [
            {
                "id": (mm.get("users") or {}).get("id"),
                "name": (mm.get("users") or {}).get("name"),
                "team": (mm.get("users") or {}).get("team_name")
                or ((mm.get("users") or {}).get("teams") or {}).get("name"),
            }
            for mm in (m.get("lunch_match_members") or [])
        ]
        restaurants = sorted(
            [
                {
                    "id": (mr.get("restaurants") or {}).get("id"),
                    "name": (mr.get("restaurants") or {}).get("name"),
                    "category": ((mr.get("restaurants") or {}).get("category") or "")
                    .split(">")[-1]
                    .strip(),
                    "reason": mr.get("reason"),
                }
                for mr in (m.get("lunch_match_restaurants") or [])
            ],
            key=lambda x: x.get("name") or "",
        )
        groups.append(
            {"group_no": m["group_no"], "members": members, "restaurants": restaurants}
        )
    return {"round_id": round_id, "groups": groups}
