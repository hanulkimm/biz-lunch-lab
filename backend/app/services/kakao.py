"""카카오 로컬 API — 키워드 검색. 광화문 권역 중심으로 음식점을 찾는다."""
import httpx

from app.config import settings

# 광화문 권역 중심 좌표 (경복궁~시청 일대)
GWANGHWAMUN = {"x": "126.9769", "y": "37.5759"}
SEARCH_RADIUS = 2000  # m
FOOD_CATEGORY = "FD6"  # 카카오 음식점 카테고리 코드

_BASE = "https://dapi.kakao.com/v2/local/search/keyword.json"


def _headers() -> dict:
    return {"Authorization": f"KakaoAK {settings.kakao_api_key}"}


def search_keyword(query: str, size: int = 15) -> list[dict]:
    """광화문 권역 음식점 키워드 검색. 카카오 place 문서를 정규화해 반환."""
    params = {
        "query": query,
        "category_group_code": FOOD_CATEGORY,
        "x": GWANGHWAMUN["x"],
        "y": GWANGHWAMUN["y"],
        "radius": SEARCH_RADIUS,
        "size": size,
        "sort": "distance",
    }
    with httpx.Client(timeout=10) as client:
        res = client.get(_BASE, params=params, headers=_headers())
        res.raise_for_status()
        docs = res.json().get("documents", [])

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
