"""태그 개편(2026-06-18) — 목적/가격 카테고리 정리. 라이브 Supabase에 1회 실행.

목적: '간단 미팅 추천','손님 접대' 삭제 → '고객사 미팅 추천' 추가, sort 재정렬
가격: 기존 태그 전부 교체 → 만원 초/중/후반대, 2만원대, 매우 비쌈
삭제 태그가 리뷰에 연결돼 있으면 review_tags 먼저 제거. 끝나면 리뷰 Pinecone 재동기화
(임베딩 텍스트에 태그명이 들어가므로 — 리뷰 수가 적어 전체 재동기화).

실행: backend 에서  .venv/Scripts/python.exe db/update_tags.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import supabase  # noqa: E402
from app.services import embedding, pinecone_client  # noqa: E402


def get_tag_id(category: str, name: str) -> str | None:
    r = (
        supabase.table("tags").select("id")
        .eq("category", category).eq("name", name).limit(1).execute().data
    )
    return r[0]["id"] if r else None


def delete_tag(category: str, name: str) -> None:
    tid = get_tag_id(category, name)
    if not tid:
        print(f"  = '{name}' 이미 없음")
        return
    supabase.table("review_tags").delete().eq("tag_id", tid).execute()  # 연결 먼저
    supabase.table("tags").delete().eq("id", tid).execute()
    print(f"  - '{name}' 삭제")


def upsert_tag(category: str, name: str, sort_order: int) -> None:
    tid = get_tag_id(category, name)
    if tid:
        supabase.table("tags").update({"sort_order": sort_order}).eq("id", tid).execute()
        print(f"  = '{name}' 유지(sort {sort_order})")
    else:
        supabase.table("tags").insert(
            {"category": category, "name": name, "sort_order": sort_order}
        ).execute()
        print(f"  + '{name}' 추가(sort {sort_order})")


def main() -> None:
    print("[목적]")
    delete_tag("목적", "간단 미팅 추천")
    delete_tag("목적", "손님 접대")
    upsert_tag("목적", "팀 점심 추천", 1)
    upsert_tag("목적", "저녁 회식 추천", 2)
    upsert_tag("목적", "상급자 회식 추천", 3)
    upsert_tag("목적", "고객사 미팅 추천", 4)

    print("[가격]")
    for old in ["가성비", "합리적인 가격", "살짝 비쌈", "가격대 높음"]:
        delete_tag("가격", old)
    for i, name in enumerate(["만원 초반대", "만원 중반대", "만원 후반대", "2만원대", "매우 비쌈"], start=1):
        upsert_tag("가격", name, i)

    # 태그 연결이 바뀐 리뷰가 있을 수 있어 전체 재동기화(리뷰 수가 적음)
    print("[Pinecone 재동기화]")
    reviews = (
        supabase.table("reviews")
        .select(
            "id, user_id, rating, comment, "
            "restaurants(id, name, category, road_address, address), "
            "review_tags(tags(name))"
        )
        .execute()
        .data
    )
    for rv in reviews:
        rest = rv.get("restaurants") or {}
        try:
            tag_names = [
                t["tags"]["name"] for t in (rv.get("review_tags") or []) if t.get("tags")
            ]
            text = embedding.build_text(
                rest.get("name"), rest.get("category"), tag_names, rv.get("comment")
            )
            vector = embedding.embed(text)
            pinecone_client.upsert_review(
                rv["id"],
                vector,
                {
                    "review_id": rv["id"],
                    "restaurant_id": rest.get("id"),
                    "restaurant_name": rest.get("name"),
                    "category": rest.get("category") or "",
                    "address": rest.get("road_address") or rest.get("address") or "",
                    "user_id": rv["user_id"],
                    "rating": rv["rating"],
                    "tags": tag_names,
                    "comment": rv.get("comment") or "",
                },
            )
            supabase.table("reviews").update({"pinecone_id": rv["id"]}).eq("id", rv["id"]).execute()
            print(f"  ✓ {rest.get('name')} 재동기화 (태그 {tag_names})")
        except Exception as e:  # 임베딩/Pinecone 장애에도 태그 변경은 유지
            print(f"  ! 재동기화 실패({rest.get('name')}): {e}")

    print("완료.")


if __name__ == "__main__":
    main()
