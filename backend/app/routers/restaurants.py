"""restaurants 라우터 — 카카오 검색 / 리뷰 있는 식당 목록(마커) / 식당 상세."""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import supabase
from app.models.schemas import KakaoPlace, RestaurantOut
from app.services import kakao

router = APIRouter()


@router.get("/kakao/search", response_model=list[KakaoPlace])
def kakao_search(query: str, _: dict = Depends(get_current_user)):
    """리뷰 작성 시 식당 선택용 — 광화문 권역 음식점 검색."""
    if not query.strip():
        return []
    return kakao.search_keyword(query)


@router.get("", response_model=list[RestaurantOut])
def list_restaurants(_: dict = Depends(get_current_user)):
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


@router.get("/{restaurant_id}")
def get_restaurant(restaurant_id: str, _: dict = Depends(get_current_user)):
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
