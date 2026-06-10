"""FastAPI 앱 엔트리포인트 — CORS 설정 + 라우터 등록 + 헬스체크."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, departments, restaurants, reviews, chat, lunch

app = FastAPI(title="Biz Lunch Lab API")

# ─── CORS ───
# 주의: allow_origins 리스트는 와일드카드 서브도메인을 인식하지 못하므로
# Vercel 프리뷰 도메인은 allow_origin_regex로 허용한다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # 로컬 개발
        settings.frontend_url,    # 프로덕션
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# ─── 라우터 등록 ───
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(departments.router, prefix="/api/departments", tags=["departments"])
app.include_router(restaurants.router, prefix="/api/restaurants", tags=["restaurants"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(lunch.router, prefix="/api/lunch", tags=["lunch"])
