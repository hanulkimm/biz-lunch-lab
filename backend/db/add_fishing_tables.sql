-- 청계천 낚시터 — 잡은 물고기 (도감 겸 주머니)
-- Supabase SQL Editor에서 실행. (RLS 켜기 선택 시 "Run and enable RLS")

CREATE TABLE IF NOT EXISTS user_fish (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id),
  fish_id         TEXT NOT NULL,            -- fish.json의 id (예: fish42)
  count           INT NOT NULL DEFAULT 1,   -- 보유 수 (판매하면 감소, 0이어도 도감 기록 유지)
  first_caught_at TIMESTAMPTZ DEFAULT NOW(),
  last_caught_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, fish_id)
);
CREATE INDEX IF NOT EXISTS idx_user_fish_user ON user_fish(user_id);
