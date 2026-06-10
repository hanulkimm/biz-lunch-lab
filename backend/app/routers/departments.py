"""departments 라우터 — 담당 목록 / 담당별 팀 목록 (회원가입·로그인 드롭다운용)."""
from fastapi import APIRouter

from app.database import supabase
from app.models.schemas import Department, Team

router = APIRouter()


@router.get("", response_model=list[Department])
def list_departments():
    res = supabase.table("departments").select("*").order("sort_order").execute()
    return res.data


@router.get("/{department_id}/teams", response_model=list[Team])
def list_teams(department_id: str):
    res = (
        supabase.table("teams")
        .select("*")
        .eq("department_id", department_id)
        .order("sort_order")
        .execute()
    )
    return res.data
