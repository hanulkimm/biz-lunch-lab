"""villager 라우터 — 닮은꼴 주민 매칭 + 프로필 저장.

사진은 요청 메모리에서만 사용하고 저장하지 않는다 (사내 개인정보 방침).
"""
import json

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.auth import get_current_user
from app.config import settings
from app.database import supabase
from app.models.schemas import UserOut, VillagerProfileSave
from app.services import villager_match

router = APIRouter()

MAX_PHOTO_BYTES = 6 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

# 주민 영어 이름 → 배경 없는 전신 이미지 URL (Nookipedia). 게임 데이터라 메모리 캐시.
_render_cache: dict[str, str] = {}
# 주민 영어 이름 → 이미지 바이트 (프록시 캐시). 주민 수가 유한해 상한 불필요.
_image_cache: dict[str, tuple[bytes, str]] = {}


def _resolve_render_url(name: str) -> str | None:
    """Nookipedia에서 주민 전신 이미지 원본 URL 조회 (성공만 캐시)."""
    if name in _render_cache:
        return _render_cache[name]
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
    if url is not None:
        _render_cache[name] = url
    return url


@router.get("/render")
def villager_render(user: dict = Depends(get_current_user)):
    """내 닮은꼴 주민의 전신 투명 PNG 경로 (낚시터 등 연출용).

    이미지 CDN(dodo.ac)이 사내망 등에서 차단되는 경우가 있어, 직접 URL 대신
    백엔드 프록시 경로(/api/villager/image/{name})를 돌려준다.
    Nookipedia가 죽어 있거나 키가 없으면 image_url=None — 프론트가 폴백 처리.
    """
    name = (user.get("villager") or {}).get("name")
    if not name:
        return {"image_url": None}
    url = _resolve_render_url(name)
    return {"image_url": f"/api/villager/image/{name}" if url else None}


@router.get("/image/{name}")
def villager_image(name: str):
    """주민 전신 이미지 프록시 — 외부 CDN을 백엔드가 대신 받아 서빙.

    공개 게임 데이터라 인증 없음. 이름은 Nookipedia 조회로 검증되므로
    임의 URL 프록시(SSRF)가 될 수 없다.
    """
    if name in _image_cache:
        content, media = _image_cache[name]
        return Response(content, media_type=media, headers={"Cache-Control": "public, max-age=86400"})

    url = _resolve_render_url(name)
    if not url:
        raise HTTPException(status_code=404, detail="주민 이미지를 찾을 수 없습니다.")
    try:
        r = httpx.get(url, timeout=15, follow_redirects=True)
        r.raise_for_status()
    except Exception:
        raise HTTPException(status_code=502, detail="이미지를 불러오지 못했습니다.")

    media = r.headers.get("content-type") or "image/png"
    _image_cache[name] = (r.content, media)
    return Response(r.content, media_type=media, headers={"Cache-Control": "public, max-age=86400"})


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
