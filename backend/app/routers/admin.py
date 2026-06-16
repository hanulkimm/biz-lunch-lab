"""admin 라우터 — 관리자 전용. 사용자 목록/PIN 리셋 + 회차 목록(집계).

회차 생성·상태변경·매칭 실행 자체는 lunch 라우터(require_admin)를 그대로 사용한다.
여기서는 관리자 대시보드에 필요한 '전체 조회' 성격의 엔드포인트를 모은다.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import hash_pin, require_admin
from app.database import supabase
from app.models.schemas import PinReset

router = APIRouter()


# ─── 사용자 ───
@router.get("/users")
def list_users(_: dict = Depends(require_admin)):
    """전체 사용자 + 팀/담당명. PIN 리셋 대상 선택용."""
    rows = (
        supabase.table("users")
        .select("id, name, is_admin, created_at, teams(name, departments(name))")
        .order("created_at")
        .execute()
        .data
    )
    out = []
    for r in rows:
        team = r.get("teams") or {}
        dept = (team.get("departments") or {}).get("name")
        out.append(
            {
                "id": r["id"],
                "name": r["name"],
                "team": team.get("name"),
                "department": dept,
                "is_admin": r["is_admin"],
                "created_at": r["created_at"],
            }
        )
    return out


@router.patch("/users/{user_id}/pin")
def reset_pin(user_id: str, body: PinReset, _: dict = Depends(require_admin)):
    """사용자 PIN을 관리자가 임시 PIN으로 재설정."""
    existing = (
        supabase.table("users").select("id").eq("id", user_id).limit(1).execute().data
    )
    if not existing:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    supabase.table("users").update({"password_hash": hash_pin(body.pin)}).eq(
        "id", user_id
    ).execute()
    return {"reset": True}


# ─── 회차 ───
@router.get("/rounds")
def list_rounds(_: dict = Depends(require_admin)):
    """전체 런치 회차 + 신청 인원 (최신순)."""
    rounds = (
        supabase.table("lunch_rounds")
        .select("*")
        .order("created_at", desc=True)
        .execute()
        .data
    )
    if not rounds:
        return []
    apps = supabase.table("lunch_applications").select("round_id").execute().data
    counts: dict[str, int] = {}
    for a in apps:
        counts[a["round_id"]] = counts.get(a["round_id"], 0) + 1
    for r in rounds:
        r["count"] = counts.get(r["id"], 0)
    return rounds
