"""tags 라우터 — 미리 정의된 태그 목록 (리뷰 작성 폼용)."""
from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import supabase

router = APIRouter()

# 분류 표시 순서 (가나다순 대신 논리적 순서로)
CATEGORY_ORDER = {"목적": 0, "분위기·시설": 1, "메뉴": 2, "가격": 3}


@router.get("")
def list_tags(_: dict = Depends(get_current_user)):
    rows = (
        supabase.table("tags")
        .select("id, category, name, sort_order")
        .execute()
        .data
    )
    rows.sort(key=lambda t: (CATEGORY_ORDER.get(t["category"], 99), t["sort_order"]))
    return rows
