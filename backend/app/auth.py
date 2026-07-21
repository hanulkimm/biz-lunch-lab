"""인증 유틸 — PIN 해싱(bcrypt), JWT 발급/검증, 현재 사용자 의존성, 관리자 체크."""
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.config import settings
from app.database import supabase

ALGORITHM = "HS256"
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)  # 토큰 없어도 통과(익명 허용)


# ─── PIN 해싱 ───
def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pin(pin: str, password_hash: str) -> bool:
    return bcrypt.checkpw(pin.encode("utf-8"), password_hash.encode("utf-8"))


# ─── JWT ───
def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


# ─── 의존성: 현재 사용자 ───
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="유효하지 않은 인증 정보입니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials, settings.jwt_secret_key, algorithms=[ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise cred_exc
    except JWTError:
        raise cred_exc

    res = (
        supabase.table("users")
        .select(
            "id, name, team_id, is_admin, villager, "
            "division, headquarters, part, team_name"
        )
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise cred_exc
    return res.data[0]


# ─── 의존성: 선택적 사용자(비로그인 허용) ───
def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(optional_security),
) -> dict | None:
    """토큰이 있으면 사용자를, 없거나 유효하지 않으면 None. 건의(익명 허용)용."""
    if not credentials:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials, settings.jwt_secret_key, algorithms=[ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    res = (
        supabase.table("users").select("id, name").eq("id", user_id).limit(1).execute()
    )
    return res.data[0] if res.data else None


# ─── 의존성: 관리자만 ───
def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다.",
        )
    return user
