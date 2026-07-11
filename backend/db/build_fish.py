"""청계천 낚시터 물고기 카탈로그 빌드 스크립트.

커뮤니티 ACNH 데이터시트(Norviah/animal-crossing)의 Fish.json에서
민물(강·연못) 어종을 추려 backend/app/data/fish.json 생성.

실행 (backend 디렉토리에서):
    python db/build_fish.py

잎 가격은 게임 판매가 ÷ 200 (리뷰 1건 50잎 대비 밸런스 — 희귀어만 잭팟).
"""
import json
import re
import urllib.request
from pathlib import Path

SOURCE_URL = (
    "https://raw.githubusercontent.com/Norviah/animal-crossing"
    "/master/json/data/Fish.json"
)
OUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "fish.json"

# 청계천 = 도심 하천 → 강/연못 서식 어종
FRESHWATER = {"River", "River (clifftop)", "River (mouth)", "Pond"}

SHADOW_KO = {
    "X-Small": "아주 작음", "Small": "작음", "Medium": "보통", "Long": "길쭉함",
    "Large": "큼", "X-Large": "아주 큼", "X-Large w/Fin": "지느러미!", "XX-Large": "거대함",
}


def parse_rate(s: str | None) -> int:
    """'4–12' → 평균 8, '1' → 1. (출현 가중치)"""
    if not s:
        return 5
    nums = [int(n) for n in re.findall(r"\d+", s)]
    return max(1, round(sum(nums) / len(nums))) if nums else 5


def build():
    print(f"다운로드: {SOURCE_URL}")
    with urllib.request.urlopen(SOURCE_URL, timeout=60) as res:
        source = json.load(res)

    fish = []
    for f in source:
        if f.get("whereHow") not in FRESHWATER:
            continue
        tr = f.get("translations") or {}
        north = f.get("hemispheres", {}).get("north", {})
        sell = f.get("sell") or 100
        fish.append(
            {
                "id": f"fish{f['internalId']}",
                "name": f["name"],
                "name_ko": tr.get("kRko") or f["name"],
                "sell_bells": sell,
                "price": max(1, round(sell / 200)),   # 판매 시 받는 나뭇잎
                "shadow": f.get("shadow") or "Medium",
                "shadow_ko": SHADOW_KO.get(f.get("shadow") or "Medium", "보통"),
                "rate": parse_rate(f.get("spawnRates")),  # 출현 가중치 (높을수록 흔함)
                "difficulty": f.get("catchDifficulty") or "Medium",
                "months": north.get("monthsArray") or list(range(1, 13)),
                "hours": north.get("timeArray") or list(range(24)),
                "months_label": " · ".join(north.get("months") or []),
                "time_label": " · ".join(north.get("time") or []),
                "habitat": f.get("whereHow"),
                "icon": f.get("iconImage"),
                "image": f.get("critterpediaImage"),
            }
        )

    fish.sort(key=lambda x: -x["rate"])  # 흔한 순 (도감은 프론트에서 재정렬)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(fish, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    rare = min(fish, key=lambda x: x["rate"])
    print(f"완료: {OUT_PATH} ({len(fish)}종)")
    print(f"가장 흔함: {fish[0]['name_ko']} (가중치 {fish[0]['rate']}, {fish[0]['price']}잎)")
    print(f"가장 희귀: {rare['name_ko']} (가중치 {rare['rate']}, {rare['price']}잎)")


if __name__ == "__main__":
    build()
