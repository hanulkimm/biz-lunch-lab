-- v2: 오픈 회원가입 — 이름+PIN만으로 가입, 조직정보(부문·본부·담당·팀)는
-- 마이페이지에서 각자 자유 기입. 기존 데이터는 그대로 유지된다.
-- Supabase SQL Editor에서 한 번 실행.

-- 0. (사전 점검) 이름 전역 고유로 바꾸기 전에 중복 이름이 있는지 확인.
--    아래 쿼리가 행을 반환하면, 해당 유저 이름을 먼저 구분되게 수정한 뒤 진행.
--    SELECT name, count(*) FROM users GROUP BY name HAVING count(*) > 1;

-- 1. team_id 필수 해제 (기존 유저는 team_id 유지, 신규 유저는 NULL 허용)
ALTER TABLE users ALTER COLUMN team_id DROP NOT NULL;

-- 2. '같은 팀 내 동명이인' 제약 제거 → 이름 전체 고유로 변경
--    (제약명이 다르면 \d users 로 확인 후 이름 교체)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_name_team_id_key;
ALTER TABLE users ADD CONSTRAINT users_name_key UNIQUE (name);

-- 3. 자유 기입 조직 필드 (모두 NULL 허용)
ALTER TABLE users ADD COLUMN IF NOT EXISTS division     TEXT;  -- 부문
ALTER TABLE users ADD COLUMN IF NOT EXISTS headquarters TEXT;  -- 본부
ALTER TABLE users ADD COLUMN IF NOT EXISTS part         TEXT;  -- 담당
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_name    TEXT;  -- 팀

-- 4. 기존 유저의 담당/팀을 텍스트 필드로 백필 (기존 조직 구조에서 복사)
UPDATE users u
SET part      = COALESCE(u.part, d.name),
    team_name = COALESCE(u.team_name, t.name)
FROM teams t
JOIN departments d ON d.id = t.department_id
WHERE u.team_id = t.id;
