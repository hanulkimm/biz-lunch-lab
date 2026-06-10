# 🍱 Biz Lunch Lab

기업사업본부 AI 기반 맛집 탐색 + 랜덤 런치 매칭 플랫폼.
상세 기획은 [BIZ_LUNCH_LAB_PLANNING.md](BIZ_LUNCH_LAB_PLANNING.md) 참고.

## 기술 스택
- **프론트엔드**: React + Vite (Vercel 배포)
- **백엔드**: FastAPI (Render 배포)
- **DB**: Supabase (PostgreSQL) / 벡터 DB: Pinecone
- **AI**: Claude `claude-sonnet-4-6` + OpenAI 임베딩 + LangChain RAG
- **지도/식당**: 카카오맵 API

## 로컬 실행

### 1. 환경변수 준비
```bash
cp backend/.env.example backend/.env      # 실제 키 입력
cp frontend/.env.example frontend/.env    # 실제 키 입력
```
> `.env`는 git에 커밋되지 않습니다. 키는 직접 채워야 합니다.

### 2. 백엔드
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows (PowerShell: .venv\Scripts\Activate.ps1)
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000  (docs: /docs)
```

### 3. 프론트엔드
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

### 4. DB 초기화 (최초 1회)
Supabase SQL Editor에서 순서대로 실행:
1. `backend/db/schema.sql`
2. `backend/db/seed.sql`

## 폴더 구조
```
backend/   FastAPI 앱 (routers / services / models), db/ SQL
frontend/  React + Vite (pages / components / api / store)
```
