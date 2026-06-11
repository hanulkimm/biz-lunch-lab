"""tags 라우터 — 미리 정의된 태그 목록 (리뷰 작성 폼용)."""
from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import supabase

router = APIRouter()


@router.get("")
def list_tags(_: dict = Depends(get_current_user)):
    return (
        supabase.table("tags")
        .select("id, category, name, sort_order")
        .order("category")
        .order("sort_order")
        .execute()
        .data
    )
