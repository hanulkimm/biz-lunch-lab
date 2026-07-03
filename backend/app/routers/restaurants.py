"""restaurants 라우터 — 카카오 검색 / 식당 목록(마커) / 룰렛 / 식당 상세."""
import random

from fastapi import APIRouter, HTTPException

from app.database import supabase
from app.models.schemas import KakaoPlace, RestaurantOut
from app.services import kakao

router = APIRouter()

# 메뉴 룰렛 카테고리 → 카카오 category 매칭 키워드
ROULETTE_PATTERNS = {
    "한식": ["한식"],
    "일식": ["일식", "초밥", "스시"],
    "중식": ["중식", "중국"],
    "양식": ["양식", "이탈리아", "파스타"],
    "분식": ["분식"],
    "고기": ["고기", "삼겹", "갈비"],
    "카페": ["카페", "샌드위치"],
}


@router.get("/kakao/search", response_model=list[KakaoPlace])
def kakao_search(query: str):
    """리뷰 작성 시 식당 선택용 — 광화문 권역 음식점 검색."""
    if not query.strip():
        return []
    return kakao.search_keyword(query)


@router.get("/by-kakao/{kakao_place_id}")
def get_restaurant_by_kakao(kakao_place_id: str):
    """카카오 place_id로 DB 식당 + 리뷰 조회. 아직 리뷰가 없어 등록 전이면 null.

    지도에서 카카오 검색으로 고른 식당의 상세(리뷰 유무 무관)를 보여주기 위함.
    """
    res = (
        supabase.table("restaurants")
        .select(
            "*, reviews(id, rating, comment, created_at, user_id, "
            "users(name), review_tags(tags(category, name)))"
        )
        .eq("kakao_place_id", kakao_place_id)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


@router.get("", response_model=list[RestaurantOut])
def list_restaurants():
    """리뷰가 1개 이상 있는 식당만 — 지도 마커용 (리뷰 수/평균 별점 포함)."""
    reviews = supabase.table("reviews").select("restaurant_id, rating").execute().data
    if not reviews:
        return []

    # 식당별 리뷰 수 / 평균 별점 집계
    agg: dict[str, list[int]] = {}
    for r in reviews:
        agg.setdefault(r["restaurant_id"], []).append(r["rating"])

    rows = (
        supabase.table("restaurants")
        .select("*")
        .in_("id", list(agg.keys()))
        .execute()
        .data
    )
    out = []
    for row in rows:
        ratings = agg.get(row["id"], [])
        out.append(
            RestaurantOut(
                **row,
                review_count=len(ratings),
                avg_rating=round(sum(ratings) / len(ratings), 1) if ratings else None,
            )
        )
    return out


@router.get("/roulette", response_model=RestaurantOut | None)
def roulette(category: str):
    """카테고리별 랜덤 식당 1곳 (랜덤 = 전체). 없으면 null."""
    q = supabase.table("restaurants").select("*")
    if category != "랜덤":
        patterns = ROULETTE_PATTERNS.get(category, [category])
        q = q.or_(",".join(f"category.ilike.%{p}%" for p in patterns))
    rows = q.execute().data
    if not rows:
        return None

    row = random.choice(rows)
    ratings = [
        r["rating"]
        for r in supabase.table("reviews").select("rating").eq("restaurant_id", row["id"]).execute().data
    ]
    return RestaurantOut(
        **row,
        review_count=len(ratings),
        avg_rating=round(sum(ratings) / len(ratings), 1) if ratings else None,
    )


@router.get("/{restaurant_id}")
def get_restaurant(restaurant_id: str):
    """식당 상세 + 리뷰 목록(작성자명, 태그 포함) — 마커 클릭 패널용."""
    res = (
        supabase.table("restaurants")
        .select(
            "*, reviews(id, rating, comment, created_at, user_id, "
            "users(name), review_tags(tags(category, name)))"
        )
        .eq("id", restaurant_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="식당을 찾을 수 없습니다.")
    return res.data[0]
