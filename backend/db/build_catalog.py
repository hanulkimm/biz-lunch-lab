"""방 꾸미기 상점 카탈로그 빌드 스크립트.

커뮤니티 ACNH 데이터시트(Norviah/animal-crossing)에서 가구·벽걸이·미술품·
벽지·바닥·러그를 큐레이션(~300종)해 backend/app/data/catalog.json 생성.

실행 (backend 디렉토리에서):
    python db/build_catalog.py

가격은 게임 벨 가격 ÷ 100 나뭇잎 (리뷰 1개 = 50잎 기준 밸런스).
산출물은 git에 포함 — 게임 데이터라 다시 빌드할 일 거의 없음.
"""
import json
import math
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

BASE = "https://raw.githubusercontent.com/Norviah/animal-crossing/master/json/data/"
OUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "catalog.json"

# 인기 시리즈 — 세트로 꾸미는 재미가 있어 우선 선발
POPULAR_SERIES = {
    "ranch", "wooden-block", "ironwood", "antique", "rattan", "log", "mermaid",
    "shell", "imperial", "zen-style", "cute", "diner", "vintage", "nordic",
    "simple", "natural wood", "flowers",
}
# 방에 다양하게 놓이도록 태그별 상한
TAG_CAP = 14
FURNITURE_TARGET = 200


def fetch(name: str):
    print(f"다운로드: {name}.json")
    with urllib.request.urlopen(BASE + urllib.parse.quote(name) + ".json", timeout=120) as r:
        return json.load(r)


def parse_size(size: str | None) -> tuple[int, int]:
    """'2x1' → (2,1). 0.5·1.5는 올림해 그리드 칸으로."""
    if not size or "x" not in size:
        return (1, 1)
    w, h = size.split("x")
    return (max(1, math.ceil(float(w))), max(1, math.ceil(float(h))))


def leaves_price(buy: int | None, sell: int | None) -> int | None:
    """벨 → 나뭇잎. 상점 미판매(-1)는 sell 기반 추정, 그것도 없으면 제외."""
    if buy and buy > 0:
        return max(5, round(buy / 100))
    if sell and sell > 0:
        return max(5, round(sell * 4 / 100))
    return None


def base_entry(x: dict, cat: str) -> dict | None:
    tr = x.get("translations") or {}
    variations = x.get("variations") or []
    v0 = variations[0] if variations else {}
    image = x.get("image") or v0.get("image")
    internal = x.get("internalId") or v0.get("internalId")
    if not image or internal is None:
        return None
    price = leaves_price(x.get("buy"), x.get("sell"))
    if price is None:
        return None
    w, h = parse_size(x.get("size"))
    return {
        "id": f"{cat}:{internal}",
        "cat": cat,
        "name": x.get("name", ""),
        "name_ko": tr.get("kRko") or x.get("name", ""),
        "tag": x.get("tag") or x.get("category") or "",
        "series": x.get("series") or "",
        "w": w,
        "h": h,
        "price": price,
        "image": image,
    }


def pick_furniture(rows: list[dict]) -> list[dict]:
    """시리즈 가점 → 태그 다양성 상한 → 가격 낮은 순으로 200종."""
    entries = []
    for x in rows:
        e = base_entry(x, "furniture")
        if not e or not (x.get("buy") and x.get("buy") > 0):
            continue  # 가구는 상점 판매품만 (이벤트템 제외)
        e["_score"] = 2 if (x.get("series") in POPULAR_SERIES) else 0
        entries.append(e)

    entries.sort(key=lambda e: (-e["_score"], e["price"]))
    picked, per_tag = [], defaultdict(int)
    for e in entries:
        if len(picked) >= FURNITURE_TARGET:
            break
        if per_tag[e["tag"]] >= TAG_CAP:
            continue
        per_tag[e["tag"]] += 1
        e.pop("_score")
        picked.append(e)
    return picked


def pick_simple(rows: list[dict], cat: str, limit: int, require_buy=True) -> list[dict]:
    entries = []
    for x in rows:
        if require_buy and not (x.get("buy") and x.get("buy") > 0):
            continue
        e = base_entry(x, cat)
        if e:
            entries.append(e)
    entries.sort(key=lambda e: e["price"])
    # 같은 태그만 몰리지 않게 라운드로빈
    by_tag = defaultdict(list)
    for e in entries:
        by_tag[e["tag"]].append(e)
    picked = []
    while len(picked) < limit and any(by_tag.values()):
        for tag in list(by_tag):
            if by_tag[tag]:
                picked.append(by_tag[tag].pop(0))
                if len(picked) >= limit:
                    break
            else:
                del by_tag[tag]
    return picked


def pick_artwork(rows: list[dict], limit: int = 15) -> list[dict]:
    picked = []
    for x in rows:
        if not x.get("genuine"):  # 진품만 판매
            continue
        e = base_entry(x, "art")
        if not e:
            continue
        e["artist"] = x.get("artist") or ""
        e["real_title"] = x.get("realArtworkTitle") or ""
        picked.append(e)
        if len(picked) >= limit:
            break
    return picked


def build():
    catalog = []
    catalog += pick_furniture(fetch("Housewares"))
    catalog += pick_simple(fetch("Wall-mounted"), "wall", 35)
    catalog += pick_artwork(fetch("Artwork"), 15)
    catalog += pick_simple(fetch("Wallpaper"), "wallpaper", 20)
    catalog += pick_simple(fetch("Floors"), "floor", 20)
    catalog += pick_simple(fetch("Rugs"), "rug", 15)

    ids = [e["id"] for e in catalog]
    assert len(ids) == len(set(ids)), "id 중복 발생"

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(catalog, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    from collections import Counter
    print(f"완료: {OUT_PATH} ({len(catalog)}종)")
    print(Counter(e["cat"] for e in catalog))


if __name__ == "__main__":
    build()
