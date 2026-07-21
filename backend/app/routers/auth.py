"""auth 라우터 — 회원가입 / 로그인 / 내 정보 / 조직정보 수정.

v2: 이름+PIN만으로 가입·로그인. 이름은 전체에서 고유(닉네임식).
조직정보(부문·본부·담당·팀)는 가입 후 마이페이지에서 각자 기입한다.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import (
    create_access_token,
    get_current_user,
    hash_pin,
    verify_pin,
)
from app.database import supabase
from app.models.schemas import (
    AuthResponse,
    LoginRequest,
    ProfileUpdate,
    SignupRequest,
    UserOut,
)

router = APIRouter()

# me / login 시 조회할 사용자 컬럼
_USER_COLS = (
    "id, name, team_id, is_admin, villager, "
    "division, headquarters, part, team_name"
)


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="이름을 입력해주세요.")

    # 이름은 전체에서 고유
    dup = supabase.table("users").select("id").eq("name", name).limit(1).execute()
    if dup.data:
        raise HTTPException(
            status_code=409, detail="이미 사용 중인 이름입니다. 다른 이름을 써주세요."
        )

    res = (
        supabase.table("users")
        .insert({"name": name, "password_hash": hash_pin(body.pin)})
        .execute()
    )
    user = res.data[0]
    token = create_access_token(user["id"])
    return AuthResponse(token=token, user=UserOut(**user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    res = (
        supabase.table("users")
        .select(f"{_USER_COLS}, password_hash")
        .eq("name", body.name.strip())
        .limit(1)
        .execute()
    )
    if not res.data or not verify_pin(body.pin, res.data[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="이름 또는 PIN이 올바르지 않습니다.")

    user = {k: v for k, v in res.data[0].items() if k != "password_hash"}
    token = create_access_token(user["id"])
    return AuthResponse(token=token, user=UserOut(**user))


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


@router.patch("/me", response_model=UserOut)
def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    """마이페이지 조직정보(부문·본부·담당·팀) 수정. 빈 값은 NULL로 저장."""

    def clean(v: str | None) -> str | None:
        v = (v or "").strip()
        return v or None

    patch = {
        "division": clean(body.division),
        "headquarters": clean(body.headquarters),
        "part": clean(body.part),
        "team_name": clean(body.team_name),
    }
    supabase.table("users").update(patch).eq("id", user["id"]).execute()
    return UserOut(**{**user, **patch})
