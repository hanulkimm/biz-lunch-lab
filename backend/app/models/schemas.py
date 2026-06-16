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


# ─── 식당 ───
class KakaoPlace(BaseModel):
    kakao_place_id: str
    name: str
    category: str | None = None
    address: str | None = None
    road_address: str | None = None
    phone: str | None = None
    latitude: float
    longitude: float
    kakao_url: str | None = None


class RestaurantOut(BaseModel):
    id: str
    kakao_place_id: str
    name: str
    category: str | None = None
    address: str | None = None
    road_address: str | None = None
    phone: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    kakao_url: str | None = None
    review_count: int = 0
    avg_rating: float | None = None


# ─── 리뷰 ───
class ReviewCreate(BaseModel):
    place: KakaoPlace                       # 카카오 검색으로 고른 식당
    rating: int = Field(ge=1, le=5)
    comment: str | None = None
    tag_ids: list[str] = []


class ReviewUpdate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = None
    tag_ids: list[str] = []


# ─── 랜덤 런치 ───
class LunchRoundCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    deadline: str | None = None  # ISO datetime, 선택


class LunchRoundStatus(BaseModel):
    status: str = Field(pattern=r"^(open|closed|matched)$")


class LunchApply(BaseModel):
    round_id: str
    food_preferences: list[str] = []          # 예: ["한식", "고기"]
    food_exclusions: str | None = None         # 못 먹는/기피 음식 자유 입력
    atmosphere_pref: str = "상관없음"          # 조용한 / 활기찬 / 상관없음


# ─── 관리자 ───
class PinReset(BaseModel):
    pin: str = Field(pattern=r"^\d{4}$", description="새 4자리 PIN")


# ─── 챗봇 ───
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
