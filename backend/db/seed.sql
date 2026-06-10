-- Biz Lunch Lab — 시드 데이터 (담당 / 팀 / 태그)
-- schema.sql 실행 후 실행.
-- 식당/리뷰 시드(콜드스타트 대응)는 정식 오픈 전 별도 입력.

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
