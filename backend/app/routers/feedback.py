"""feedback 라우터 — 방문자 건의 접수(익명 허용) + 관리자 조회/읽음/삭제."""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_optional_user, require_admin
from app.database import supabase
from app.models.schemas import FeedbackCreate

router = APIRouter()


@router.post("", status_code=201)
def create_feedback(body: FeedbackCreate, user: dict | None = Depends(get_optional_user)):
    """건의 접수. 로그인 상태면 이름/유저 연결, 아니면 익명."""
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="내용을 입력해주세요.")
    supabase.table("feedback").insert(
        {
            "content": content,
            "author_name": user["name"] if user else None,
            "user_id": user["id"] if user else None,
        }
    ).execute()
    return {"ok": True}


@router.get("")
def list_feedback(_: dict = Depends(require_admin)):
    """전체 건의 (최신순) — 관리자 대시보드용."""
    return (
        supabase.table("feedback")
        .select("*")
        .order("created_at", desc=True)
        .execute()
        .data
    )


@router.patch("/{feedback_id}/read")
def mark_read(feedback_id: str, _: dict = Depends(require_admin)):
    supabase.table("feedback").update({"is_read": True}).eq("id", feedback_id).execute()
    return {"ok": True}


@router.delete("/{feedback_id}")
def delete_feedback(feedback_id: str, _: dict = Depends(require_admin)):
    supabase.table("feedback").delete().eq("id", feedback_id).execute()
    return {"ok": True}
