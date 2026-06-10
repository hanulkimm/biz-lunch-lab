"""Pydantic 스키마 — 요청/응답 모델."""
from pydantic import BaseModel, Field


# ─── 조직 ───
class Department(BaseModel):
    id: str
    name: str
    sort_order: int = 0


class Team(BaseModel):
    id: str
    department_id: str
    name: str
    sort_order: int = 0


# ─── 인증 ───
class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    team_id: str
    pin: str = Field(pattern=r"^\d{4}$", description="4자리 숫자 PIN")


class LoginRequest(BaseModel):
    name: str
    team_id: str
    pin: str = Field(pattern=r"^\d{4}$")


class UserOut(BaseModel):
    id: str
    name: str
    team_id: str
    is_admin: bool = False


class AuthResponse(BaseModel):
    token: str
    user: UserOut
