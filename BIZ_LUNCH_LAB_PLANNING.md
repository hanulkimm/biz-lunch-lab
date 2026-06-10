# 🍱 Biz Lunch Lab — 프로젝트 기획 문서

> **기업사업본부 AI 기반 맛집 탐색 및 랜덤 런치 매칭 플랫폼**  
> 개발 방식: Claude Code / 개발 기간: 3주

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | Biz Lunch Lab |
| 대상 | 기업사업본부 169명 |
| 목표 | 광화문 권역 맛집 탐색 + 랜덤 런치 매칭 |
| 배포 목표 | 실제 사용 가능한 수준 |
| 개발 기간 | 3주 |
| 개발 도구 | Claude Code + GitHub |

---

## 2. 기능 목록

### 🔴 Must Have

#### 인증
- 회원가입: 담당 선택 → 팀 선택 → 이름 + 4자리 숫자 PIN
- 로그인: 담당 + 팀 + 이름 + PIN → JWT 토큰 발급
- 로그인 상태 localStorage에 토큰 저장

#### 맛집 탐색
- 카카오맵 API 기반 광화문·안국·시청 권역 지도
- 리뷰 있는 식당 마커 표시
- 마커 클릭 → 사이드 패널 (식당 정보 + 리뷰)
- AI 챗봇 검색 (LangChain RAG, 대화 히스토리 유지)
- 리뷰 작성: 카카오 검색으로 식당 선택 → 별점 + 태그 + 코멘트
- 마이페이지: 내 리뷰 수정/삭제

#### 랜덤 런치
- 참여 신청 (취향 입력)
- 관리자가 회차 열기/닫기/매칭 실행
- Claude API가 취향 기반 4~6인 그룹 구성 + 식당 추천
- 매칭 결과 확인

### 🟡 Should Have
- 식당 상세 페이지
- 신청 현황 보기

### 🟢 Nice to Have
- 메뉴 룰렛 (8카테고리 스피너 + 식당 추천)

---

## 3. 기술 스택

| 역할 | 기술 | 비용 |
|------|------|------|
| 프론트엔드 | React + Vite | 무료 |
| 프론트 배포 | Vercel | 무료 |
| 백엔드 | Python FastAPI | 무료 |
| 백엔드 배포 | Render | 무료 |
| 인증 | JWT (python-jose) | 무료 |
| LLM | Claude API (claude-sonnet-4-6) | 유료 |
| 임베딩 | OpenAI text-embedding-3-small | 유료 (극소) |
| 벡터 DB | Pinecone | 무료 티어 |
| 일반 DB | Supabase (PostgreSQL) | 무료 티어 |
| RAG 프레임워크 | LangChain | 무료 |
| 식당 데이터 | 카카오맵 API | 무료 |
| 개발 도구 | Claude Code + GitHub | - |

### 아키텍처 흐름
```
사용자 브라우저
    ↕ HTTPS
Vercel (React + Vite)
    ↕ REST API + JWT
Render (FastAPI)  ← CORS: Vercel 도메인 허용
    ↕ LangChain
├── Anthropic Claude API   — LLM 답변 생성
├── OpenAI Embedding API   — 텍스트 → 벡터
├── Pinecone               — 시맨틱 검색
├── Supabase PostgreSQL    — 식당/리뷰/사용자
└── 카카오맵 API           — 지도 + 식당 검색
```

---

## 4. 인증 방식

### 회원가입
```
담당 선택 → 팀 선택 (담당에 따라 필터) → 이름 입력 → 4자리 숫자 PIN
→ POST /api/auth/signup
→ PIN은 bcrypt 해시 후 저장
→ 성공 시 JWT 토큰 반환 → localStorage 저장
→ UNIQUE(name, team_id) — 같은 팀 내 동명이인 없음으로 간주
```

### 로그인
```
담당 선택 → 팀 선택 → 이름 + PIN
→ POST /api/auth/login
→ PIN 검증 → JWT 토큰 반환 → localStorage 저장
```

### 토큰 관리
```
- 토큰: localStorage('token')에 저장
- 만료: 7일
- 모든 API 요청 헤더: Authorization: Bearer {token}
- 토큰 없으면 → 로그인 페이지로 리다이렉트
```

### 관리자
```
- 관리자: 김하늘 (기업사업개발1담당 / 기업사업개발2팀)
- users 테이블 is_admin = true
- 회원가입 후 Supabase에서 직접 is_admin = true 설정
- /admin 페이지: is_admin = true인 사용자만 접근 가능
- 관리자 전용 기능: 랜덤 런치 회차 생성/닫기, 매칭 실행, 사용자 PIN 리셋
```

### PIN 분실 / 보안
```
- PIN 분실 시 복구 경로 없음 → 관리자가 /admin에서 해당 사용자 PIN 리셋
  (관리자가 임시 PIN으로 재설정 → 사용자에게 전달 → 다음 로그인 시 변경 유도)
- 4자리 PIN은 1만 조합으로 무차별 대입에 약함 → 로그인 실패 N회 시
  일시 잠금 또는 rate limit 적용 (사내 도구라 우선순위는 낮음)
```

---

## 5. 조직 구조 (담당 → 팀)

같은 팀명이 다른 담당에 존재할 수 있음 → DB에서 department_id + name 조합으로 구분

| 담당 | 팀 |
|------|-----|
| 기업사업1담당 | 기업사업기획팀, AX제조고객1팀, AX제조고객2팀, AX제조고객3팀, Mega AX TF팀 |
| 기업사업2담당 | AX제조고객1팀, AX제조고객2팀, AX제조고객3팀, AX제조고객4팀, AX제조고객5팀 |
| 기업사업3담당 | 유통고객1팀, 유통고객2팀, 글로벌고객팀, 서비스고객팀 |
| 기업사업개발1담당 | 기업사업개발1팀, 기업사업개발2팀, 기업사업개발3팀, 모빌리티사업개발팀 |
| 기업사업개발2담당 | 기업사업개발1팀, 기업사업개발2팀, 기업사업개발3팀 |

총 5개 담당 / 21개 팀

---

## 6. 페이지 구조

```
/              → 로그인
/signup        → 회원가입
/map           → 메인 (지도 + 챗봇/식당 패널)
/restaurant/:id → 식당 상세
/review/write  → 리뷰 작성
/roulette      → 메뉴 룰렛
/lunch         → 랜덤 런치
/mypage        → 마이페이지 (내 리뷰 수정/삭제)
/admin         → 관리자 (is_admin=true만 접근 가능)
```

### 하단 탭 (로그인 후)
```
🗺️ 맛집 지도 | 🤖 AI 검색 | 🎲 메뉴 룰렛 | 🍱 랜덤 런치 | 👤 마이페이지
```

---

## 7. 주요 UX 플로우

### 랜딩 → 로그인
```
/ 접속
→ 계정 있으면: 담당 선택 → 팀 선택 → 이름 + PIN 입력 → 로그인
→ 계정 없으면: "회원가입" 링크 → /signup
→ 로그인 성공 → JWT 저장 → /map
→ is_admin=true이면 헤더에 "관리자" 뱃지 + /admin 접근 가능
```

### 메인 지도
```
기본: 지도 풀스크린, 패널 없음
AI 검색 탭 클릭 → 챗봇 패널 슬라이드인
마커 클릭 → 식당 정보 패널 슬라이드인
```

### 리뷰 작성
```
마커 클릭 → [리뷰 쓰기] 버튼
→ 식당 이름 확인 (카카오 검색으로 변경 가능)
→ 별점 + 태그 멀티선택 + 코멘트
→ 제출 → 임베딩 생성 → Pinecone 저장 (pinecone_id 반환 → reviews.pinecone_id 저장)
```

### 리뷰 수정
```
마이페이지 → 내 리뷰 선택 → 수정
→ 수정 완료 → 새 임베딩 생성 → Pinecone upsert (기존 pinecone_id로 덮어쓰기)
→ Supabase reviews 업데이트
```

### 리뷰 삭제
```
마이페이지 → 내 리뷰 선택 → 삭제
→ Pinecone delete (pinecone_id로)
→ Supabase reviews 삭제 (review_tags ON DELETE CASCADE로 자동 삭제)
```

### 랜덤 런치
```
관리자: 회차 생성 (open)
구성원: 취향 입력 + 신청
관리자: 매칭 실행 버튼
Claude API: 취향 분석 → 4~6인 그룹 균등 구성 + 식당 추천
구성원: 결과 확인
```

---

## 8. 태그 목록

### 목적
- 팀 점심 추천
- 저녁 회식 추천
- 간단 미팅 추천
- 상급자 회식 추천

### 시설/환경
- 룸 예약 가능
- 단체석 10인+
- 주차 가능
- 조용한 분위기
- 활기찬 분위기
- 채식 메뉴

### 메뉴/가격
- 점심 특선 있음
- 가성비
- 합리적인 가격
- 가격대 높음

---

## 9. 메뉴 룰렛

### 8카테고리
```
한식 / 일식 / 중식 / 양식 / 분식 / 고기 / 카페 / 랜덤
```

### 동작 방식
```
1. 스피너 돌리기 → 카테고리 결정
2. 결정된 카테고리로 Supabase에서 해당 category 식당 랜덤 1개 조회
3. 결과 카드 표시: 카테고리명 + 식당명 + 별점 + 태그
4. [지도에서 보기] 버튼 → /map으로 이동 + 해당 식당 마커 포커스
5. [다시 돌리기] 버튼으로 재시도 가능
```

### 카테고리 매핑 (카카오맵 category_name 기준)
```
한식   → category LIKE '%한식%'
일식   → category LIKE '%일식%' OR '%초밥%' OR '%스시%'
중식   → category LIKE '%중식%' OR '%중국%'
양식   → category LIKE '%양식%' OR '%이탈리아%' OR '%파스타%'
분식   → category LIKE '%분식%'
고기   → category LIKE '%고기%' OR '%삼겹%' OR '%갈비%'
카페   → category LIKE '%카페%' OR '%샌드위치%'
랜덤   → 카테고리 무관 전체 랜덤
```

---

## 10. AI 챗봇 (RAG)

### 시스템 프롬프트
```
당신은 기업사업본부 사내 맛집 추천 도우미입니다.
직원들이 직접 등록한 리뷰와 태그를 기반으로만 답변하세요.
리뷰에 없는 내용은 절대 지어내지 마세요.
추천 시 식당명, 추천 이유, 관련 리뷰 내용을 포함해 답변하세요.
한국어로 친근하게 답변하세요.
```

### RAG 파이프라인
```
사용자 질문
→ OpenAI Embedding으로 벡터 변환
→ Pinecone 유사도 검색 (top-k=5, cosine)
→ 검색 결과 있음: 리뷰 컨텍스트 + 질문 → Claude API → 추천 답변
→ 검색 결과 없음: "아직 등록된 리뷰가 없어요. 첫 번째 리뷰를 작성해보세요!"
```

### 챗봇 대화 히스토리
```
- React state로 세션 동안 유지
- API 요청 시 history 배열 함께 전송 [{role, content}, ...]
- 페이지 새로고침 시 초기화 (DB 저장 안 함)
```

---

## 11. 랜덤 런치 매칭 로직

### 그룹 구성 규칙
```
- 목표: 4~6인으로 최대한 균등하게 구성
- Claude API 프롬프트에 명시: "신청자를 4~6인 그룹으로 최대한 균등하게 나눠주세요"
- 예: 13명 → 5+4+4 / 12명 → 4+4+4 / 7명 → 4+3
- 취향(음식 선호, 기피, 분위기)이 비슷한 사람끼리 우선 배치
```

### 매칭 실행 Claude API 프롬프트
> 모델: `claude-sonnet-4-6` / JSON 응답은 파싱 실패 대비 try-except 처리
```
다음은 랜덤 런치 신청자 목록과 각자의 취향입니다.
신청자들을 4~6인 그룹으로 최대한 균등하게 나눠주세요.
취향이 비슷한 사람끼리 같은 그룹이 되도록 구성하고,
각 그룹에 적합한 식당을 리뷰 데이터 기반으로 1~2곳 추천해주세요.

[신청자 목록]
{applicants}

[등록된 식당 리뷰 요약]
{restaurant_reviews}

JSON 형식으로 응답해주세요:
{
  "groups": [
    {
      "group_no": 1,
      "members": ["이름1", "이름2", ...],
      "recommended_restaurants": [
        {"name": "식당명", "reason": "추천 이유"}
      ]
    }
  ]
}
```

---

## 12. CORS 설정

```python
# FastAPI main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",           # 로컬 개발
        "https://biz-lunch-lab.vercel.app" # 프로덕션 (실제 도메인으로 교체)
    ],
    # 주의: allow_origins 리스트는 와일드카드 서브도메인("https://*.vercel.app")을
    # 인식하지 못함. Vercel 프리뷰 도메인까지 허용하려면 정규식을 사용해야 함.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 13. DB 스키마 (Supabase PostgreSQL)

```sql
-- 1. 담당
CREATE TABLE departments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0
);

-- 2. 팀 (담당 하위, 같은 팀명이 다른 담당에 존재 가능)
CREATE TABLE teams (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES departments(id),
  name          TEXT NOT NULL,
  sort_order    INT DEFAULT 0,
  UNIQUE (department_id, name)
);

-- 3. 사용자 (4자리 PIN 인증)
CREATE TABLE users (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  team_id       UUID NOT NULL REFERENCES teams(id),
  password_hash TEXT NOT NULL,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, team_id)
);

-- 4. 식당 (카카오맵 API)
CREATE TABLE restaurants (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kakao_place_id TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  category       TEXT,
  address        TEXT,
  road_address   TEXT,
  phone          TEXT,
  latitude       DECIMAL(10,8),
  longitude      DECIMAL(11,8),
  kakao_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 태그 (미리 정의)
CREATE TABLE tags (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category   TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  UNIQUE (category, name)
);

-- 6. 리뷰
CREATE TABLE reviews (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  pinecone_id   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 리뷰-태그 (N:M)
CREATE TABLE review_tags (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id),
  UNIQUE (review_id, tag_id)
);

-- 8. 랜덤 런치 회차
CREATE TABLE lunch_rounds (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','closed','matched')),
  deadline   TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 랜덤 런치 신청
CREATE TABLE lunch_applications (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id         UUID NOT NULL REFERENCES lunch_rounds(id),
  user_id          UUID NOT NULL REFERENCES users(id),
  food_preferences TEXT[],
  food_exclusions  TEXT,
  atmosphere_pref  TEXT DEFAULT '상관없음',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (round_id, user_id)
);

-- 10. 매칭 그룹
CREATE TABLE lunch_matches (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id   UUID NOT NULL REFERENCES lunch_rounds(id),
  group_no   INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. 그룹 멤버
CREATE TABLE lunch_match_members (
  id       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES lunch_matches(id),
  user_id  UUID NOT NULL REFERENCES users(id),
  UNIQUE (match_id, user_id)
);

-- 12. 그룹 추천 식당
CREATE TABLE lunch_match_restaurants (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id      UUID NOT NULL REFERENCES lunch_matches(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  reason        TEXT,
  sort_order    INT DEFAULT 1
);

-- 인덱스
CREATE INDEX idx_teams_department    ON teams(department_id);
CREATE INDEX idx_reviews_restaurant  ON reviews(restaurant_id);
CREATE INDEX idx_reviews_user        ON reviews(user_id);
CREATE INDEX idx_review_tags_review  ON review_tags(review_id);
CREATE INDEX idx_applications_round  ON lunch_applications(round_id);
CREATE INDEX idx_members_match       ON lunch_match_members(match_id);
```

---

## 14. 시드 데이터

```sql
-- 담당
INSERT INTO departments (name, sort_order) VALUES
('기업사업1담당', 1),
('기업사업2담당', 2),
('기업사업3담당', 3),
('기업사업개발1담당', 4),
('기업사업개발2담당', 5);

-- 기업사업1담당 팀
INSERT INTO teams (department_id, name, sort_order)
SELECT d.id, t.name, t.ord
FROM departments d,
(VALUES
  ('기업사업기획팀', 1), ('AX제조고객1팀', 2), ('AX제조고객2팀', 3),
  ('AX제조고객3팀', 4), ('Mega AX TF팀', 5)
) AS t(name, ord)
WHERE d.name = '기업사업1담당';

-- 기업사업2담당 팀
INSERT INTO teams (department_id, name, sort_order)
SELECT d.id, t.name, t.ord
FROM departments d,
(VALUES
  ('AX제조고객1팀', 1), ('AX제조고객2팀', 2), ('AX제조고객3팀', 3),
  ('AX제조고객4팀', 4), ('AX제조고객5팀', 5)
) AS t(name, ord)
WHERE d.name = '기업사업2담당';

-- 기업사업3담당 팀
INSERT INTO teams (department_id, name, sort_order)
SELECT d.id, t.name, t.ord
FROM departments d,
(VALUES
  ('유통고객1팀', 1), ('유통고객2팀', 2),
  ('글로벌고객팀', 3), ('서비스고객팀', 4)
) AS t(name, ord)
WHERE d.name = '기업사업3담당';

-- 기업사업개발1담당 팀
INSERT INTO teams (department_id, name, sort_order)
SELECT d.id, t.name, t.ord
FROM departments d,
(VALUES
  ('기업사업개발1팀', 1), ('기업사업개발2팀', 2),
  ('기업사업개발3팀', 3), ('모빌리티사업개발팀', 4)
) AS t(name, ord)
WHERE d.name = '기업사업개발1담당';

-- 기업사업개발2담당 팀
INSERT INTO teams (department_id, name, sort_order)
SELECT d.id, t.name, t.ord
FROM departments d,
(VALUES
  ('기업사업개발1팀', 1), ('기업사업개발2팀', 2), ('기업사업개발3팀', 3)
) AS t(name, ord)
WHERE d.name = '기업사업개발2담당';

-- 태그
INSERT INTO tags (category, name, sort_order) VALUES
('목적', '팀 점심 추천', 1),
('목적', '저녁 회식 추천', 2),
('목적', '간단 미팅 추천', 3),
('목적', '상급자 회식 추천', 4),
('시설', '룸 예약 가능', 1),
('시설', '단체석 10인+', 2),
('시설', '주차 가능', 3),
('시설', '조용한 분위기', 4),
('시설', '활기찬 분위기', 5),
('시설', '채식 메뉴', 6),
('메뉴/가격', '점심 특선 있음', 1),
('메뉴/가격', '가성비', 2),
('메뉴/가격', '합리적인 가격', 3),
('메뉴/가격', '가격대 높음', 4);
```

### ⚠️ 콜드스타트 대응 (식당·리뷰 초기 데이터)
```
오픈 시점에 리뷰가 0개면 → 챗봇은 "리뷰 없어요"만 답하고,
룰렛은 추천할 식당이 없고, 지도에도 마커가 없음 (서비스 공허).

따라서 정식 오픈 전 광화문·안국·시청 권역 식당 20~30곳을
카카오 검색으로 등록하고, 대표 리뷰를 미리 입력해 둘 것.
(임베딩 → Pinecone upsert까지 포함되어야 챗봇/룰렛이 동작)

참고: 카카오 로컬 API는 키워드·카테고리·좌표만 제공하며
카카오맵의 별점/리뷰 텍스트는 외부로 주지 않음.
→ "리뷰 있는 식당"이란 우리 DB에 직원이 작성한 리뷰가 있는 식당을 의미.
```

---

## 15. Pinecone 구조

```
인덱스명:   biz-lunch-reviews
dimension:  1536 (OpenAI text-embedding-3-small)
metric:     cosine

벡터 ID:    reviews.pinecone_id 와 1:1 매핑

임베딩 텍스트:
  "{식당명} {카테고리} {태그1} {태그2} {코멘트}"
  예: "을지로 한우리 한식 룸 예약 가능 주차 가능 저녁 회식. 룸이 넓어요."

메타데이터:
  restaurant_id, restaurant_name, review_id,
  user_id, rating, category, address

동기화 규칙:
  리뷰 등록 → pinecone.upsert(id=review.id, vector=embedding, metadata=...)
  리뷰 수정 → 새 임베딩 생성 → pinecone.upsert(id=review.pinecone_id, ...) 덮어쓰기
  리뷰 삭제 → pinecone.delete(ids=[review.pinecone_id])
```

---

## 16. API 엔드포인트 (FastAPI)

### 인증
```
POST  /api/auth/signup           회원가입 (담당+팀+이름+PIN)
POST  /api/auth/login            로그인 → JWT 반환
GET   /api/auth/me               내 정보 조회 (토큰 검증, is_admin 포함)
GET   /api/admin/users           사용자 목록 (관리자 only)
PATCH /api/admin/users/:id/pin   사용자 PIN 리셋 (관리자 only)
```

### 조직
```
GET  /api/departments            담당 목록
GET  /api/departments/:id/teams  담당별 팀 목록
```

### 식당
```
GET  /api/restaurants              식당 목록 (리뷰 있는 것)
GET  /api/restaurants/:id          식당 상세
GET  /api/restaurants/kakao/search 카카오맵 검색
GET  /api/restaurants/roulette     카테고리별 랜덤 식당 1개
                                   query: ?category=한식
```

### 리뷰
```
POST   /api/reviews        리뷰 등록 (임베딩 + Pinecone upsert)
PUT    /api/reviews/:id    리뷰 수정 (본인만, 임베딩 재생성 + Pinecone upsert)
DELETE /api/reviews/:id    리뷰 삭제 (본인만, Pinecone delete)
GET    /api/reviews/my     내 리뷰 목록
```

### AI 챗봇
```
POST /api/chat
  body:   { message: string, history: [{role, content}] }
  return: { answer: string, restaurants: [] }
  검색 결과 없을 때: { answer: "아직 등록된 리뷰가 없어요. 첫 번째 리뷰를 작성해보세요!" }
```

### 랜덤 런치
```
GET    /api/lunch/rounds             현재 open 회차
POST   /api/lunch/rounds             회차 생성 (관리자 only)
PATCH  /api/lunch/rounds/:id/status  상태 변경 (관리자 only)
POST   /api/lunch/apply              신청
DELETE /api/lunch/apply/:id          신청 취소
GET    /api/lunch/apply/count        신청 인원 수
POST   /api/lunch/match              매칭 실행 (관리자 only)
GET    /api/lunch/result/:round_id   매칭 결과
```

---

## 17. 폴더 구조

```
biz-lunch-lab/
├── BIZ_LUNCH_LAB_PLANNING.md
│
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI 앱, CORS 설정
│   │   ├── database.py       # Supabase 연결
│   │   ├── auth.py           # JWT 유틸, 관리자 권한 체크
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── departments.py
│   │   │   ├── restaurants.py
│   │   │   ├── reviews.py
│   │   │   ├── chat.py
│   │   │   └── lunch.py
│   │   ├── services/
│   │   │   ├── rag_service.py      # LangChain RAG
│   │   │   ├── embedding.py        # OpenAI 임베딩
│   │   │   ├── pinecone_client.py  # upsert / delete
│   │   │   └── kakao.py            # 카카오맵 API
│   │   └── models/                 # Pydantic schemas
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Map.jsx
│   │   │   ├── RestaurantDetail.jsx
│   │   │   ├── ReviewWrite.jsx
│   │   │   ├── Roulette.jsx
│   │   │   ├── Lunch.jsx
│   │   │   ├── MyPage.jsx
│   │   │   └── Admin.jsx
│   │   ├── components/
│   │   │   ├── Map/
│   │   │   │   ├── KakaoMap.jsx
│   │   │   │   └── MarkerLayer.jsx
│   │   │   ├── ChatPanel/
│   │   │   │   ├── ChatPanel.jsx
│   │   │   │   └── ChatMessage.jsx
│   │   │   ├── RestaurantPanel/
│   │   │   │   └── RestaurantPanel.jsx
│   │   │   └── common/
│   │   │       ├── BottomNav.jsx
│   │   │       └── ProtectedRoute.jsx  # is_admin 체크 포함
│   │   ├── api/
│   │   │   ├── auth.js
│   │   │   ├── restaurants.js
│   │   │   ├── reviews.js
│   │   │   ├── chat.js
│   │   │   └── lunch.js
│   │   ├── store/
│   │   │   └── authStore.js    # user, token, is_admin 상태 관리
│   │   └── App.jsx
│   └── package.json
│
└── README.md
```

---

## 18. 환경변수

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=biz-lunch-reviews
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=...
KAKAO_API_KEY=...
JWT_SECRET_KEY=...
JWT_EXPIRE_DAYS=7
FRONTEND_URL=https://biz-lunch-lab.vercel.app

# frontend/.env
VITE_API_URL=http://localhost:8000
VITE_KAKAO_MAP_KEY=...
```

---

## 19. 개발 순서 (3주)

### 0단계 — 사전 준비 (코딩 전)
- [ ] 레포 구조 스캐폴딩 + `.gitignore` (`.env`, `node_modules`, `__pycache__`, `venv`)
- [ ] 외부 계정/키 발급: Supabase / Pinecone / 카카오(REST+JS SDK) / Anthropic / OpenAI
- [ ] `.env.example` 작성 (실제 키는 커밋 금지)
- [ ] Supabase 접근 방식 결정: 백엔드 service_key 단일 진입 + RLS off
      (권한 통제는 FastAPI 레이어에서)

### 1주차 — 기반 + 인증
- [ ] Supabase 프로젝트 생성 → SQL 실행 (스키마 + 시드)
- [ ] Pinecone 인덱스 생성 (biz-lunch-reviews, dim=1536)
- [ ] 카카오 API 키 발급 (REST API + 지도 JS SDK)
- [ ] FastAPI 기본 서버 + CORS 설정 + Render 배포
- [ ] 인증 구현: 회원가입 / 로그인 / JWT / 관리자 권한
- [ ] React 기본 앱 + Vercel 배포
- [ ] 로그인/회원가입 페이지
- [ ] 관리자 계정 Supabase에서 is_admin=true 설정

### 2주차 — 맛집 탐색 핵심
- [ ] 카카오 지도 연동 (지도 + 마커)
- [ ] 식당 등록 (카카오 검색 → DB 자동 저장)
- [ ] 리뷰 작성 API (임베딩 → Pinecone upsert)
- [ ] 리뷰 수정/삭제 (Pinecone 동기화 포함)
- [ ] 마커 클릭 → 식당 패널
- [ ] LangChain RAG 파이프라인 (시스템 프롬프트 포함)
- [ ] AI 챗봇 API + 프론트 UI

### 3주차 — 랜덤 런치 + 마무리
- [ ] 랜덤 런치 신청/매칭 API
- [ ] 매칭 실행 (Claude API 그룹 균등 구성)
- [ ] 마이페이지 (내 리뷰 수정/삭제)
- [ ] 메뉴 룰렛 (카테고리 + 식당 추천)
- [ ] 관리자 화면
- [ ] 시드 데이터 입력 (식당 + 리뷰) — 콜드스타트 해소
- [ ] 전체 테스트 + 버그 수정 + 최종 배포

### 배포 체크리스트
- [ ] 카카오 개발자 콘솔에 배포 도메인(Vercel) 등록 — 누락 시 지도 안 뜸
- [ ] Render 무료티어 cold start(15분 sleep) 대응: "서버 깨우는 중" 로딩 UX
- [ ] 프로덕션 환경변수 등록 (Render / Vercel 각각)
- [ ] CORS allow_origin_regex에 실제 프로덕션 도메인 반영 확인

---

## 20. 주요 결정 사항

| 항목 | 결정 |
|------|------|
| LLM 모델 | claude-sonnet-4-6 (챗봇 + 매칭) |
| 인증 | 4자리 숫자 PIN 회원가입/로그인 |
| PIN 분실 | 관리자가 /admin에서 리셋 |
| 관리자 | 김하늘 (기업사업개발1담당/기업사업개발2팀), is_admin=true |
| 조직 구조 | 담당(5) → 팀(21), 같은 팀명이 다른 담당에 존재 가능 |
| 동명이인 | 같은 팀 내 없음으로 간주, UNIQUE(name, team_id) 유지 |
| 토큰 | JWT, 만료 7일, localStorage 저장 |
| 식당 등록 | 별도 메뉴 없음 — 리뷰 작성 시 카카오 검색으로 자동 등록 |
| 태그 | 미리 정의된 14개 태그 멀티 선택 |
| 챗봇 히스토리 | 세션 동안 유지 (React state, DB 저장 안 함) |
| RAG 결과 없을 때 | "아직 등록된 리뷰가 없어요. 첫 번째 리뷰를 작성해보세요!" |
| Pinecone 동기화 | 수정 → upsert, 삭제 → delete |
| 랜덤 런치 매칭 | 관리자 수동 버튼, 4~6인 균등 구성 |
| 모바일 지원 | PC 전용 |
| 리뷰 수정/삭제 | 본인 리뷰만 마이페이지에서 가능 |
| 메뉴 룰렛 | 8카테고리 + 해당 카테고리 식당 랜덤 추천 |
| CORS | Vercel 도메인 + localhost:5173 허용 |