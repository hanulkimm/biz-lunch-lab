"""villager 라우터 — 닮은꼴 주민 매칭 + 프로필 저장.

사진은 요청 메모리에서만 사용하고 저장하지 않는다 (사내 개인정보 방침).
"""
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.auth import get_current_user
from app.database import supabase
from app.models.schemas import UserOut, VillagerProfileSave
from app.services import villager_match

router = APIRouter()

MAX_PHOTO_BYTES = 6 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/match")
async def match(
    quiz: str = Form(...),
    photo: UploadFile | None = File(None),
    user: dict = Depends(get_current_user),
):
    try:
        quiz_data = json.loads(quiz)
        assert isinstance(quiz_data, dict)
    except (json.JSONDecodeError, AssertionError):
        raise HTTPException(status_code=400, detail="퀴즈 응답 형식이 올바르지 않습니다.")

    photo_bytes = None
    media_type = None
    if photo is not None:
        if photo.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail="jpg/png/webp/gif 이미지만 올릴 수 있어요.")
        photo_bytes = await photo.read()
        if len(photo_bytes) > MAX_PHOTO_BYTES:
            raise HTTPException(status_code=400, detail="사진이 너무 커요 (최대 6MB).")
        media_type = photo.content_type

    return villager_match.match(quiz_data, photo_bytes, media_type)


@router.put("/profile", response_model=UserOut)
def save_profile(body: VillagerProfileSave, user: dict = Depends(get_current_user)):
    res = (
        supabase.table("users")
        .update({"villager": body.villager})
        .eq("id", user["id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=500, detail="프로필 저장에 실패했습니다.")
    return UserOut(**{**user, "villager": body.villager})


@router.delete("/profile", response_model=UserOut)
def clear_profile(user: dict = Depends(get_current_user)):
    supabase.table("users").update({"villager": None}).eq("id", user["id"]).execute()
    return UserOut(**{**user, "villager": None})
