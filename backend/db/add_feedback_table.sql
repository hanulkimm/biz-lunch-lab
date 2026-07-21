-- 건의 창구 — 방문자가 수정 요청·기능 제안을 보내는 피드백 테이블.
-- 로그인 사용자는 이름/유저가 연결되고, 비로그인은 익명(NULL)으로 저장된다.
-- Supabase SQL Editor에서 한 번 실행.

CREATE TABLE feedback (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content     TEXT NOT NULL,
  author_name TEXT,                          -- 로그인 시 이름, 익명이면 NULL
  user_id     UUID REFERENCES users(id),     -- 로그인 사용자면 연결
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_created ON feedback(created_at DESC);
