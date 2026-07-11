-- 방 꾸미기 + 나뭇잎 경제 테이블
-- Supabase SQL Editor에서 실행.

-- 나뭇잎 잔액
ALTER TABLE users ADD COLUMN IF NOT EXISTS leaves INT NOT NULL DEFAULT 0;

-- 나뭇잎 거래 내역 (적립/차감 장부)
CREATE TABLE IF NOT EXISTS leaf_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id),
  amount     INT NOT NULL,              -- +적립 / -차감
  reason     TEXT NOT NULL,             -- 'review:<id>' | 'retro' | 'buy:<item_id>'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leaf_logs_user ON leaf_logs(user_id);

-- 구매한 아이템 (인벤토리)
CREATE TABLE IF NOT EXISTS user_items (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id),
  item_id    TEXT NOT NULL,             -- catalog.json의 id (예: furniture:1051)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(user_id);

-- 방 레이아웃 (유저당 1개)
CREATE TABLE IF NOT EXISTS user_rooms (
  user_id    UUID PRIMARY KEY REFERENCES users(id),
  layout     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
