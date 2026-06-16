"""lunch 라우터 — 랜덤 런치 회차/신청/매칭/결과.

회차 생성·상태변경·매칭 실행은 관리자(require_admin)만.
신청/취소/조회는 로그인 사용자.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user, require_admin
from app.database import supabase
from app.models.schemas import LunchApply, LunchRoundCreate, LunchRoundStatus
from app.services import lunch_match

router = APIRouter()


def _current_round() -> dict | None:
    """가장 최근에 만든 open/matched 회차 1개 (없으면 None)."""
    rows = (
        supabase.table("lunch_rounds")
        .select("*")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    return rows[0] if rows else None


def _count(round_id: str) -> int:
    res = (
        supabase.table("lunch_applications")
        .select("id", count="exact")
        .eq("round_id", round_id)
        .execute()
    )
    return res.count or 0


# ─── 회차 ───
@router.get("/rounds")
def current_round(user: dict = Depends(get_current_user)):
    """현재 회차 + 내 신청 여부 + 신청 인원. 회차 없으면 round=None."""
    rnd = _current_round()
    if not rnd:
        return {"round": None, "my_application": None, "count": 0}

    mine = (
        supabase.table("lunch_applications")
        .select("*")
        .eq("round_id", rnd["id"])
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
        .data
    )
    return {
        "round": rnd,
        "my_application": mine[0] if mine else None,
        "count": _count(rnd["id"]),
    }


@router.post("/rounds", status_code=201)
def create_round(body: LunchRoundCreate, admin: dict = Depends(require_admin)):
    row = (
        supabase.table("lunch_rounds")
        .insert(
            {
                "title": body.title,
                "deadline": body.deadline,
                "created_by": admin["id"],
                "status": "open",
            }
        )
        .execute()
        .data[0]
    )
    return row


@router.patch("/rounds/{round_id}/status")
def set_round_status(
    round_id: str, body: LunchRoundStatus, _: dict = Depends(require_admin)
):
    existing = (
        supabase.table("lunch_rounds").select("id").eq("id", round_id).limit(1).execute().data
    )
    if not existing:
        raise HTTPException(status_code=404, detail="회차를 찾을 수 없습니다.")
    supabase.table("lunch_rounds").update({"status": body.status}).eq("id", round_id).execute()
    return {"updated": True, "status": body.status}


# ─── 신청 ───
@router.post("/apply", status_code=201)
def apply(body: LunchApply, user: dict = Depends(get_current_user)):
    rnd = (
        supabase.table("lunch_rounds").select("*").eq("id", body.round_id).limit(1).execute().data
    )
    if not rnd:
        raise HTTPException(status_code=404, detail="회차를 찾을 수 없습니다.")
    if rnd[0]["status"] != "open":
        raise HTTPException(status_code=400, detail="신청이 마감된 회차입니다.")

    row = (
        supabase.table("lunch_applications")
        .upsert(
            {
                "round_id": body.round_id,
                "user_id": user["id"],
                "food_preferences": body.food_preferences,
                "food_exclusions": body.food_exclusions,
                "atmosphere_pref": body.atmosphere_pref,
            },
            on_conflict="round_id,user_id",
        )
        .execute()
        .data[0]
    )
    return {"application": row, "count": _count(body.round_id)}


@router.delete("/apply/{application_id}")
def cancel(application_id: str, user: dict = Depends(get_current_user)):
    existing = (
        supabase.table("lunch_applications")
        .select("id, user_id, round_id")
        .eq("id", application_id)
        .limit(1)
        .execute()
        .data
    )
    if not existing:
        raise HTTPException(status_code=404, detail="신청 내역을 찾을 수 없습니다.")
    if existing[0]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="본인 신청만 취소할 수 있습니다.")
    supabase.table("lunch_applications").delete().eq("id", application_id).execute()
    return {"deleted": True, "count": _count(existing[0]["round_id"])}


@router.get("/apply/count")
def apply_count(round_id: str, _: dict = Depends(get_current_user)):
    return {"count": _count(round_id)}


# ─── 매칭 ───
@router.post("/match")
def match(round_id: str, _: dict = Depends(require_admin)):
    rnd = (
        supabase.table("lunch_rounds").select("id").eq("id", round_id).limit(1).execute().data
    )
    if not rnd:
        raise HTTPException(status_code=404, detail="회차를 찾을 수 없습니다.")
    try:
        return lunch_match.run_match(round_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/result/{round_id}")
def result(round_id: str, _: dict = Depends(get_current_user)):
    return lunch_match.get_result(round_id)
