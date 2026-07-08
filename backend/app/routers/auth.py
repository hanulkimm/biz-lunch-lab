"""auth 라우터 — 회원가입 / 로그인 / 내 정보."""
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import (
    create_access_token,
    get_current_user,
    hash_pin,
    verify_pin,
)
from app.database import supabase
from app.models.schemas import AuthResponse, LoginRequest, SignupRequest, UserOut

router = APIRouter()


def _team_exists(team_id: str) -> bool:
    res = supabase.table("teams").select("id").eq("id", team_id).limit(1).execute()
    return bool(res.data)


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest):
    if not _team_exists(body.team_id):
        raise HTTPException(status_code=400, detail="존재하지 않는 팀입니다.")

    # 같은 팀 내 동명이인 방지 — UNIQUE(name, team_id)
    dup = (
        supabase.table("users")
        .select("id")
        .eq("name", body.name)
        .eq("team_id", body.team_id)
        .limit(1)
        .execute()
    )
    if dup.data:
        raise HTTPException(
            status_code=409, detail="같은 팀에 동일한 이름이 이미 등록되어 있습니다."
        )

    res = (
        supabase.table("users")
        .insert(
            {
                "name": body.name,
                "team_id": body.team_id,
                "password_hash": hash_pin(body.pin),
            }
        )
        .execute()
    )
    user = res.data[0]
    token = create_access_token(user["id"])
    return AuthResponse(token=token, user=UserOut(**user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    res = (
        supabase.table("users")
        .select("id, name, team_id, is_admin, villager, password_hash")
        .eq("name", body.name)
        .eq("team_id", body.team_id)
        .limit(1)
        .execute()
    )
    if not res.data or not verify_pin(body.pin, res.data[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="이름 또는 PIN이 올바르지 않습니다.")

    user = res.data[0]
    token = create_access_token(user["id"])
    return AuthResponse(token=token, user=UserOut(**user))


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)
