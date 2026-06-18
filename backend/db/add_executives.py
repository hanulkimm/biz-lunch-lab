"""직책자(본부장/상무) 수용을 위한 조직 데이터 멱등 추가.

라이브 Supabase DB에 안전하게 반복 실행 가능 — 이미 있으면 건너뛴다.
실행: backend 디렉터리에서  .venv/Scripts/python.exe db/add_executives.py

구조(A안):
  - "기업사업본부" 담당(sort_order 0) + "본부장" 팀  → 노형래 본부장
  - 기존 5개 담당 각각에 "담당 직속" 팀(sort_order 0) → 각 담당 상무
계정은 만들지 않는다(본인이 직접 회원가입). 여기선 가입 시 고를 소속/팀만 준비.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import supabase  # noqa: E402

EXEC_TEAM = "담당 직속"
DAMDANGS = [
    "기업사업1담당",
    "기업사업2담당",
    "기업사업3담당",
    "기업사업개발1담당",
    "기업사업개발2담당",
]


def ensure_department(name: str, sort_order: int) -> str:
    rows = supabase.table("departments").select("id").eq("name", name).limit(1).execute().data
    if rows:
        print(f"  = 담당 '{name}' 이미 있음")
        return rows[0]["id"]
    row = supabase.table("departments").insert({"name": name, "sort_order": sort_order}).execute().data[0]
    print(f"  + 담당 '{name}' 추가")
    return row["id"]


def ensure_team(department_id: str, name: str, sort_order: int) -> None:
    rows = (
        supabase.table("teams")
        .select("id")
        .eq("department_id", department_id)
        .eq("name", name)
        .limit(1)
        .execute()
        .data
    )
    if rows:
        print(f"    = 팀 '{name}' 이미 있음")
        return
    supabase.table("teams").insert(
        {"department_id": department_id, "name": name, "sort_order": sort_order}
    ).execute()
    print(f"    + 팀 '{name}' 추가")


def dept_id(name: str) -> str | None:
    rows = supabase.table("departments").select("id").eq("name", name).limit(1).execute().data
    return rows[0]["id"] if rows else None


def main() -> None:
    print("[기업사업본부 + 본부장]")
    hq = ensure_department("기업사업본부", 0)
    ensure_team(hq, "본부장", 1)

    print("[각 담당 직속(상무)]")
    for name in DAMDANGS:
        did = dept_id(name)
        if not did:
            print(f"  ! 담당 '{name}' 을(를) 찾을 수 없음 — 건너뜀")
            continue
        print(f"  {name}")
        ensure_team(did, EXEC_TEAM, 0)

    print("완료.")


if __name__ == "__main__":
    main()
