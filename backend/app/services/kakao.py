"""카카오 로컬 API — 키워드 검색. 광화문 권역 중심으로 음식점을 찾는다."""
import httpx

from app.config import settings

# 광화문 권역 중심 좌표 (경복궁~시청 일대)
GWANGHWAMUN = {"x": "126.9769", "y": "37.5759"}
SEARCH_RADIUS = 2000  # m
# 카카오 카테고리 코드 — 음식점(FD6) + 카페(CE7). 키워드 API는 코드를 1개만
# 받으므로 카테고리별로 각각 호출한 뒤 거리순으로 병합한다.
FOOD_CATEGORIES = ("FD6", "CE7")

_BASE = "https://dapi.kakao.com/v2/local/search/keyword.json"


def _headers() -> dict:
    return {"Authorization": f"KakaoAK {settings.kakao_api_key}"}


def search_keyword(query: str, size: int = 15, page: int = 1) -> list[dict]:
    """광화문 권역 음식점·카페 키워드 검색. 카카오 place 문서를 정규화해 반환.

    page(1~3)로 거리순 결과의 다음 페이지를 받을 수 있다(룰렛 다양성용).
    """
    docs: list[dict] = []
    seen: set[str] = set()
    with httpx.Client(timeout=10) as client:
        for code in FOOD_CATEGORIES:
            params = {
                "query": query,
                "category_group_code": code,
                "x": GWANGHWAMUN["x"],
                "y": GWANGHWAMUN["y"],
                "radius": SEARCH_RADIUS,
                "size": size,
                "page": page,
                "sort": "distance",
            }
            res = client.get(_BASE, params=params, headers=_headers())
            res.raise_for_status()
            for d in res.json().get("documents", []):
                if d["id"] not in seen:
                    seen.add(d["id"])
                    docs.append(d)

    # 카테고리별 결과를 합쳐 다시 거리순(가까운 순)으로 정렬 후 size개만
    docs.sort(key=lambda d: int(d.get("distance") or 10**9))
    docs = docs[:size]

    return [
        {
            "kakao_place_id": d["id"],
            "name": d["place_name"],
            "category": d.get("category_name"),
            "address": d.get("address_name"),
            "road_address": d.get("road_address_name"),
            "phone": d.get("phone"),
            "latitude": float(d["y"]),
            "longitude": float(d["x"]),
            "kakao_url": d.get("place_url"),
        }
        for d in docs
    ]
