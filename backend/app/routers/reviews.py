"""reviews 라우터 — 리뷰 작성/수정/삭제 + 내 리뷰. Pinecone 동기화 포함.

식당은 리뷰 작성 시 카카오 place 기준으로 자동 upsert(별도 등록 메뉴 없음).
"""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import supabase
from app.models.schemas import ReviewCreate, ReviewUpdate
from app.services import embedding, leaf_economy, pinecone_client

router = APIRouter()


def _tag_names(tag_ids: list[str]) -> list[str]:
    if not tag_ids:
        return []
    rows = supabase.table("tags").select("name").in_("id", tag_ids).execute().data
    return [r["name"] for r in rows]


def _sync_pinecone(review_id: str, restaurant: dict, rating: int,
                   comment: str | None, tag_names: list[str], user_id: str) -> bool:
    """임베딩 생성 → Pinecone upsert → reviews.pinecone_id 갱신. 실패해도 리뷰는 유지."""
    try:
        text = embedding.build_text(
            restaurant["name"], restaurant.get("category"), tag_names, comment
        )
        vector = embedding.embed(text)
        pinecone_client.upsert_review(
            review_id,
            vector,
            {
                "review_id": review_id,
                "restaurant_id": restaurant["id"],
                "restaurant_name": restaurant["name"],
                "category": restaurant.get("category") or "",
                "address": restaurant.get("road_address") or restaurant.get("address") or "",
                "user_id": user_id,
                "rating": rating,
                "tags": tag_names,
                "comment": comment or "",
            },
        )
        supabase.table("reviews").update({"pinecone_id": review_id}).eq("id", review_id).execute()
        return True
    except Exception as e:  # 임베딩/Pinecone 장애 시에도 리뷰 자체는 보존
        print(f"[pinecone sync failed] review={review_id}: {e}")
        return False


@router.post("", status_code=201)
def create_review(body: ReviewCreate, user: dict = Depends(get_current_user)):
    # 1. 식당 upsert (카카오 place 기준)
    restaurant = (
        supabase.table("restaurants")
        .upsert(body.place.model_dump(), on_conflict="kakao_place_id")
        .execute()
        .data[0]
    )

    # 2. 리뷰 insert
    review = (
        supabase.table("reviews")
        .insert(
            {
                "restaurant_id": restaurant["id"],
                "user_id": user["id"],
                "rating": body.rating,
                "comment": body.comment,
            }
        )
        .execute()
        .data[0]
    )

    # 3. 태그 연결
    if body.tag_ids:
        supabase.table("review_tags").insert(
            [{"review_id": review["id"], "tag_id": t} for t in body.tag_ids]
        ).execute()

    # 4. Pinecone 동기화
    synced = _sync_pinecone(
        review["id"], restaurant, body.rating, body.comment,
        _tag_names(body.tag_ids), user["id"],
    )

    # 5. 나뭇잎 적립 (실패해도 리뷰는 유지)
    awarded, balance = 0, None
    try:
        awarded = leaf_economy.review_reward(body.comment, len(body.tag_ids))
        balance = leaf_economy.adjust(user["id"], awarded, f"review:{review['id']}")
    except Exception as e:
        print(f"[leaf award failed] review={review['id']}: {e}")
        awarded = 0

    return {
        "review": review,
        "restaurant_id": restaurant["id"],
        "indexed": synced,
        "leaves_awarded": awarded,
        "leaves_balance": balance,
    }


@router.put("/{review_id}")
def update_review(review_id: str, body: ReviewUpdate, user: dict = Depends(get_current_user)):
    existing = (
        supabase.table("reviews")
        .select("id, user_id, restaurant_id, restaurants(*)")
        .eq("id", review_id)
        .limit(1)
        .execute()
        .data
    )
    if not existing:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다.")
    if existing[0]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="본인 리뷰만 수정할 수 있습니다.")

    supabase.table("reviews").update(
        {"rating": body.rating, "comment": body.comment, "updated_at": "now()"}
    ).eq("id", review_id).execute()

    # 태그 교체
    supabase.table("review_tags").delete().eq("review_id", review_id).execute()
    if body.tag_ids:
        supabase.table("review_tags").insert(
            [{"review_id": review_id, "tag_id": t} for t in body.tag_ids]
        ).execute()

    # Pinecone 덮어쓰기 (같은 id로 upsert)
    synced = _sync_pinecone(
        review_id, existing[0]["restaurants"], body.rating, body.comment,
        _tag_names(body.tag_ids), user["id"],
    )
    return {"updated": True, "indexed": synced}


@router.delete("/{review_id}")
def delete_review(review_id: str, user: dict = Depends(get_current_user)):
    existing = (
        supabase.table("reviews")
        .select("id, user_id, pinecone_id")
        .eq("id", review_id)
        .limit(1)
        .execute()
        .data
    )
    if not existing:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다.")
    if existing[0]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="본인 리뷰만 삭제할 수 있습니다.")

    # review_tags는 ON DELETE CASCADE로 자동 삭제
    supabase.table("reviews").delete().eq("id", review_id).execute()
    if existing[0].get("pinecone_id"):
        try:
            pinecone_client.delete_review(existing[0]["pinecone_id"])
        except Exception as e:
            print(f"[pinecone delete failed] review={review_id}: {e}")
    return {"deleted": True}


@router.get("")
def list_reviews():
    """전체 리뷰 목록 (최신순) — 식당·작성자·태그 포함. 목록보기용(공개)."""
    return (
        supabase.table("reviews")
        .select(
            "id, rating, comment, created_at, "
            "restaurants(id, name, category), users(name), "
            "review_tags(tags(id, category, name))"
        )
        .order("created_at", desc=True)
        .limit(500)
        .execute()
        .data
    )


@router.get("/my")
def my_reviews(user: dict = Depends(get_current_user)):
    return (
        supabase.table("reviews")
        .select(
            "id, rating, comment, created_at, "
            "restaurants(id, name, category), review_tags(tags(id, category, name))"
        )
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
        .data
    )
