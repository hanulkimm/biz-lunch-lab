-- 닮은꼴 주민 프로필 저장 컬럼 추가
-- Supabase SQL Editor에서 실행.
-- 저장 형식: {"id","name","name_ko","species_ko","personality_ko","hobby_ko",
--             "birthday","catchphrase_ko","icon","photo","bubble_color",
--             "name_color","match_percent","reason"}

ALTER TABLE users ADD COLUMN IF NOT EXISTS villager JSONB;
