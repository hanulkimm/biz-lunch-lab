"""villager 라우터 — 닮은꼴 주민 매칭 + 프로필 저장.

사진은 요청 메모리에서만 사용하고 저장하지 않는다 (사내 개인정보 방침).
"""
import json

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.auth import get_current_user
from app.config import settings
from app.database import supabase
from app.models.schemas import UserOut, VillagerProfileSave
from app.services import villager_match

router = APIRouter()

MAX_PHOTO_BYTES = 6 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

# 주민 영어 이름 → 배경 없는 전신 이미지 URL (Nookipedia). 게임 데이터라 메모리 캐시.
_render_cache: dict[str, str | None] = {}


@router.get("/render")
def villager_render(user: dict = Depends(get_current_user)):
    """내 닮은꼴 주민의 전신 투명 PNG URL (낚시터 등 연출용).

    Nookipedia API가 죽어 있거나 키가 없으면 image_url=None — 프론트가 폴백 처리.
    """
    name = (user.get("villager") or {}).get("name")
    if not name:
        return {"image_url": None}
    if name in _render_cache:
        return {"image_url": _render_cache[name]}
    url = None
    try:
        r = httpx.get(
            "https://api.nookipedia.com/villagers",
            params={"name": name},
            headers={"X-API-KEY": settings.nookipedia_api_key, "Accept-Version": "2.0.0"},
            timeout=8,
        )
        data = r.json()
        if isinstance(data, list) and data:
            url = data[0].get("image_url")
    except Exception:
        url = None
    _render_cache[name] = url
    return {"image_url": url}


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
