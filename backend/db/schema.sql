-- Biz Lunch Lab — DB 스키마 (Supabase PostgreSQL)
-- Supabase SQL Editor에서 실행. 이후 seed.sql 실행.

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
  villager      JSONB,  -- 닮은꼴 주민 프로필 (add_villager_column.sql)
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
