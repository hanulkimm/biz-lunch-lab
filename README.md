# 🍱 Biz Lunch Lab

> **기업사업본부 AI 기반 맛집 탐색 · 랜덤 런치 매칭 플랫폼**
> 광화문 권역에서 동료들과 점심 맛집을 모으고, AI로 찾고, 랜덤으로 함께 떠나는 "점심 섬" 🌿

<p>
  <img src="https://img.shields.io/badge/status-deployed-2ea44f" />
  <img src="https://img.shields.io/badge/frontend-Vercel-000?logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/backend-Render-46E3B7?logo=render&logoColor=white" />
</p>

- 🌐 **Live**: https://biz-lunch-lab.vercel.app
- 🔗 **API**: https://biz-lunch-lab-api.onrender.com

---

## 1. 프로젝트 소개

| 항목 | 내용 |
|------|------|
| **서비스명** | Biz Lunch Lab |
| **대상** | 기업사업본부 임직원 (약 169명) |
| **목적** | 광화문 권역 점심 맛집 정보를 사내에 모으고, AI 추천·랜덤 런치로 **점심 고민과 부서 간 교류 단절**을 해결 |
| **컨셉** | 동물의 숲 톤의 "점심 무인도" — 가볍고 친근한 사내 도구 |

### 기대 효과
- 🍽️ **점심 결정 피로 감소** — 검증된 사내 리뷰 + AI 추천 + 메뉴 룰렛
- 🤝 **부서 간 네트워킹** — 취향 기반 랜덤 런치 매칭으로 새로운 동료와 식사
- 📚 **사내 맛집 지식 축적** — 리뷰·태그가 쌓일수록 추천 품질 향상 (RAG)

---

## 2. 주요 기능

| 기능 | 설명 |
|------|------|
| 🔐 **인증** | 담당·팀·이름 + 4자리 PIN(bcrypt) 기반 회원가입/로그인, JWT 발급 |
| 🗺️ **맛집 지도** | 카카오맵 위에 리뷰 있는 식당 마커 표시, 이름·종류 검색, 마커 클릭 시 상세 패널 |
| 🤖 **AI 챗봇 (또리)** | LangChain RAG — 사내 리뷰를 임베딩·검색해 Claude가 추천 (대화 히스토리 유지) |
| ✍️ **리뷰 작성** | 카카오 검색으로 식당 선택 → 별점·태그(4분류 21개)·코멘트 → 임베딩 후 Pinecone 색인 |
| 🎲 **메뉴 룰렛** | 8개 카테고리 스피너 → 해당 종류 식당 랜덤 추천 |
| 🍱 **랜덤 런치** | 취향 입력 후 신청 → 관리자 매칭 실행 → **Claude가 4~6인 그룹 + 식당 추천** |
| 👤 **마이페이지** | 내 리뷰 목록 수정/삭제 |
| 🛠️ **관리자** | 런치 회차 생성/마감/매칭, 구성원 PIN 리셋 |
| 🌗 **다크 모드** | 라이트/다크 테마 토글 (지도 타일까지 야간 톤 전환) |

---

## 3. 사용 흐름 & 시나리오

```mermaid
flowchart LR
    A["🛬 랜딩"] --> B["🪪 주민 등록 / 로그인"]
    B --> C["🗺️ 지도 탐색"]
    C --> D["✍️ 리뷰 작성"]
    C --> E["🤖 AI 챗봇 검색"]
    C --> F["🎲 메뉴 룰렛"]
    B --> G["🍱 랜덤 런치 신청"]
    G --> H["🛠️ 관리자 매칭 실행"]
    H --> I["🎉 그룹 · 추천 식당 확인"]
```

**예시 시나리오 — "신규 입사자 민지의 첫 점심"**
1. 사내 링크로 접속 → **담당·팀·이름·PIN**으로 입도(가입).
2. **지도**에서 동료들이 남긴 리뷰 맛집을 둘러보고, "국밥"으로 검색해 마커로 이동.
3. 애매하면 **또리 챗봇**에 "조용하고 가성비 좋은 점심 추천해줘" → 사내 리뷰 기반 답변.
4. 다녀온 곳은 **리뷰 작성**(별점·태그·코멘트) → 다음 사람을 위한 데이터로 축적.
5. 새 동료와 친해지고 싶으면 **랜덤 런치** 신청(선호 음식·기피·분위기 입력).
6. 관리자가 회차를 **매칭**하면, Claude가 취향 비슷한 4~6인 그룹 + 추천 식당을 묶어주고 결과 화면에서 **내 그룹**을 확인.

---

## 4. 핵심 동작

### 🤖 AI 챗봇 (RAG 파이프라인)
사내에 등록된 **리뷰만** 근거로 답하며, 근거가 없으면 지어내지 않고 리뷰 작성을 안내합니다.

```mermaid
flowchart LR
    Q["사용자 질문"] --> E["OpenAI 임베딩<br/>(512d)"]
    E --> P["Pinecone<br/>top-k 유사도 검색"]
    P --> CTX["리뷰 컨텍스트 구성<br/>(식당·별점·태그·코멘트)"]
    CTX --> CL["Claude<br/>답변 생성"]
    CL --> R["추천 + 근거 리뷰 + 식당 카드"]
    P -. 결과 없음 .-> N["첫 리뷰 작성 안내"]
```

- **리뷰 작성 시**: 리뷰 텍스트(식당명·카테고리·태그·코멘트)를 임베딩 → `reviews.pinecone_id`로 Pinecone에 upsert. 수정/삭제 시 같이 동기화.

### 🍱 랜덤 런치 매칭 (Claude)
신청자 취향과 사내 식당 리뷰 요약을 함께 넣어, Claude가 그룹과 식당을 JSON으로 설계합니다.

```mermaid
flowchart LR
    AP["신청자 취향<br/>(선호·기피·분위기)"] --> PR["프롬프트 구성"]
    RV["등록 식당 리뷰 요약"] --> PR
    PR --> CL["Claude"]
    CL --> J["JSON: 4~6인 그룹<br/>+ 그룹별 추천 식당"]
    J --> M["이름→user_id<br/>식당명→restaurant_id 매핑"]
    M --> DB[("Supabase 적재<br/>matches / members / restaurants")]
    CL -. JSON 파싱 실패 .-> FB["취향 무시 균등 분할 폴백"]
```

- 추천 식당은 **등록된 식당 목록 안에서만** 고르도록 제약(환각 방지), 미배정자는 첫 그룹에 보정 합류.

---

## 5. 아키텍처 & 기술 스택

```mermaid
flowchart TD
    Dev["👩‍💻 Developers"] -->|git push| GH["GitHub"]
    GH -. auto deploy .-> FE
    GH -. auto deploy .-> API

    Client["👤 Client (브라우저)"] -->|HTTPS| FE
    Client -. 카카오맵 SDK .-> KAKAO["Kakao Map API"]

    subgraph Vercel["☁️ Vercel"]
        FE["Web Frontend<br/>React + Vite SPA"]
    end
    subgraph Render["☁️ Render"]
        API["API Server<br/>FastAPI · JWT"]
    end

    FE -->|"REST API + JWT"| API

    API --> DB[("Supabase<br/>PostgreSQL")]
    API --> VEC[("Pinecone<br/>Vector DB")]
    API --> LLM["Anthropic Claude<br/>추천 · 매칭"]
    API --> EMB["OpenAI<br/>Embedding"]
    API --> KAKAO
```

### 기술 스택

**Frontend**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-state-443E38)

**Backend**

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)

**Data & AI**

![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-Vector_DB-000000?logo=pinecone&logoColor=white)
![Claude](https://img.shields.io/badge/Anthropic-Claude-D97757?logo=anthropic&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-Embeddings-412991?logo=openai&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-RAG-1C3C3C?logo=langchain&logoColor=white)
![Kakao](https://img.shields.io/badge/Kakao_Map-API-FFCD00?logo=kakao&logoColor=black)

**Deploy & Dev**

![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white)

---

## 6. 설계 문서

### ERD

```mermaid
erDiagram
    departments ||--o{ teams : has
    teams ||--o{ users : belongs
    users ||--o{ reviews : writes
    restaurants ||--o{ reviews : receives
    reviews ||--o{ review_tags : tagged
    tags ||--o{ review_tags : used
    users ||--o{ lunch_applications : applies
    lunch_rounds ||--o{ lunch_applications : collects
    lunch_rounds ||--o{ lunch_matches : produces
    lunch_matches ||--o{ lunch_match_members : groups
    users ||--o{ lunch_match_members : member
    lunch_matches ||--o{ lunch_match_restaurants : recommends
    restaurants ||--o{ lunch_match_restaurants : suggested

    departments {
        uuid id PK
        text name
    }
    teams {
        uuid id PK
        uuid department_id FK
        text name
    }
    users {
        uuid id PK
        text name
        uuid team_id FK
        text password_hash
        bool is_admin
    }
    restaurants {
        uuid id PK
        text kakao_place_id UK
        text name
        text category
        float latitude
        float longitude
    }
    tags {
        uuid id PK
        text category
        text name
    }
    reviews {
        uuid id PK
        uuid restaurant_id FK
        uuid user_id FK
        int rating
        text comment
        text pinecone_id
    }
    review_tags {
        uuid id PK
        uuid review_id FK
        uuid tag_id FK
    }
    lunch_rounds {
        uuid id PK
        text title
        text status
        uuid created_by FK
    }
    lunch_applications {
        uuid id PK
        uuid round_id FK
        uuid user_id FK
        text food_preferences
        text atmosphere_pref
    }
    lunch_matches {
        uuid id PK
        uuid round_id FK
        int group_no
    }
    lunch_match_members {
        uuid id PK
        uuid match_id FK
        uuid user_id FK
    }
    lunch_match_restaurants {
        uuid id PK
        uuid match_id FK
        uuid restaurant_id FK
        text reason
    }
```

> 전체 정의: [`backend/db/schema.sql`](backend/db/schema.sql)

### API

| 영역 | 메서드 & 엔드포인트 | 설명 |
|------|------|------|
| 인증 | `POST /api/auth/signup` · `POST /api/auth/login` · `GET /api/auth/me` | 회원가입 / 로그인 / 내 정보 |
| 조직 | `GET /api/departments` · `GET /api/departments/{id}/teams` | 담당 / 팀 목록 (드롭다운) |
| 태그 | `GET /api/tags` | 리뷰 태그 목록 (4분류) |
| 식당 | `GET /api/restaurants` · `GET /api/restaurants/{id}` · `GET /api/restaurants/kakao/search` · `GET /api/restaurants/roulette` | 마커 목록 / 상세 / 카카오 검색 / 룰렛 |
| 리뷰 | `POST /api/reviews` · `PUT /api/reviews/{id}` · `DELETE /api/reviews/{id}` · `GET /api/reviews/my` | 작성 / 수정 / 삭제 / 내 리뷰 (Pinecone 동기화) |
| 챗봇 | `POST /api/chat` | RAG 기반 맛집 추천 |
| 랜덤 런치 | `GET·POST /api/lunch/rounds` · `PATCH /api/lunch/rounds/{id}/status` · `POST /api/lunch/apply` · `DELETE /api/lunch/apply/{id}` · `GET /api/lunch/apply/count` · `POST /api/lunch/match` · `GET /api/lunch/result/{id}` | 회차 / 신청 / 매칭 / 결과 |
| 관리자 | `GET /api/admin/users` · `PATCH /api/admin/users/{id}/pin` · `GET /api/admin/rounds` | 사용자·회차 관리 (관리자 전용) |

> 인터랙티브 문서: 백엔드 실행 후 `http://localhost:8000/docs` (Swagger UI)

---

## 7. 로컬 실행

### 1) 환경변수
```bash
cp backend/.env.example backend/.env      # 실제 키 입력
cp frontend/.env.example frontend/.env    # 실제 키 입력
```
> `.env`는 커밋되지 않습니다. 키 목록은 각 `.env.example` 참고.

### 2) 백엔드
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload     # http://localhost:8000  (docs: /docs)
```

### 3) 프론트엔드
```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

### 4) DB 초기화 (최초 1회)
Supabase SQL Editor에서 순서대로 실행:
1. `backend/db/schema.sql`
2. `backend/db/seed.sql`

---

## 8. 폴더 구조

```
biz-lunch-lab/
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── routers/         # auth, departments, restaurants, reviews,
│   │   │                    #   tags, chat, lunch, admin
│   │   ├── services/        # embedding, pinecone, rag, kakao, lunch_match
│   │   ├── models/          # Pydantic 스키마
│   │   ├── auth.py          # JWT · bcrypt · 권한
│   │   └── main.py          # 앱 엔트리 + CORS
│   └── db/                  # schema.sql, seed.sql, 마이그레이션 스크립트
├── frontend/                # React + Vite
│   └── src/
│       ├── pages/           # Landing, Login, Signup, Map, ReviewWrite,
│       │                    #   Roulette, Lunch, MyPage, Admin
│       ├── components/      # Map, ChatPanel, RestaurantPanel, common
│       ├── api/             # axios 클라이언트별 API
│       └── store/           # zustand (auth, theme)
├── render.yaml              # Render 배포 블루프린트
└── README.md
```
