-- Biz Lunch Lab — 시드 데이터 (담당 / 팀 / 태그)
-- schema.sql 실행 후 실행.
-- 식당/리뷰 시드(콜드스타트 대응)는 정식 오픈 전 별도 입력.

-- 담당 (기업사업본부는 본부장 수용용 — 직책자는 팀 레벨이 아니라 그 위에 있으므로
--       "기업사업본부" 담당 + "본부장" 팀, 각 담당엔 "담당 직속" 팀을 둬서 상무를 수용)
INSERT INTO departments (name, sort_order) VALUES
('기업사업본부', 0),
('기업사업1담당', 1),
('기업사업2담당', 2),
('기업사업3담당', 3),
('기업사업개발1담당', 4),
('기업사업개발2담당', 5);

-- 기업사업본부 — 본부장
INSERT INTO teams (department_id, name, sort_order)
SELECT d.id, '본부장', 1 FROM departments d WHERE d.name = '기업사업본부';

-- 각 담당 직속(상무) 팀 — sort_order 0으로 팀 목록 맨 위 노출
INSERT INTO teams (department_id, name, sort_order)
SELECT d.id, '담당 직속', 0
FROM departments d
WHERE d.name IN ('기업사업1담당','기업사업2담당','기업사업3담당',
                 '기업사업개발1담당','기업사업개발2담당');

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

-- 태그 (4분류 21개)
INSERT INTO tags (category, name, sort_order) VALUES
('목적', '팀 점심 추천', 1),
('목적', '저녁 회식 추천', 2),
('목적', '간단 미팅 추천', 3),
('목적', '상급자 회식 추천', 4),
('목적', '손님 접대', 5),
('분위기·시설', '룸 예약 가능', 1),
('분위기·시설', '단체석 10인+', 2),
('분위기·시설', '주차 가능', 3),
('분위기·시설', '조용한 분위기', 4),
('분위기·시설', '활기찬 분위기', 5),
('분위기·시설', '회전율 좋아요', 6),
('분위기·시설', '회전율 안좋아요', 7),
('메뉴', '채식 메뉴', 1),
('메뉴', '점심 특선 있음', 2),
('메뉴', '푸짐한 양', 3),
('메뉴', '혼밥 가능', 4),
('메뉴', '해장 굿', 5),
('가격', '가성비', 1),
('가격', '합리적인 가격', 2),
('가격', '살짝 비쌈', 3),
('가격', '가격대 높음', 4);
