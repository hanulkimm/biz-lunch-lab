"""나뭇잎 경제 — 카탈로그 로드 + 적립/차감 + 기존 리뷰 소급 적립.

리뷰 1개 = 50잎 (+코멘트·태그 알차게 쓰면 20잎 보너스).
잔액은 users.leaves, 모든 변동은 leaf_logs 장부에 기록.
"""
import json
from pathlib import Path

from app.database import supabase

_CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "catalog.json"
CATALOG: list[dict] = json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))
BY_ID: dict[str, dict] = {item["id"]: item for item in CATALOG}

REVIEW_REWARD = 50
REVIEW_BONUS = 20   # 코멘트 10자 이상 + 태그 1개 이상


def get_balance(user_id: str) -> int:
    row = supabase.table("users").select("leaves").eq("id", user_id).limit(1).execute().data
    return (row[0].get("leaves") or 0) if row else 0


def adjust(user_id: str, amount: int, reason: str) -> int:
    """잔액 변동 + 장부 기록. 새 잔액 반환."""
    balance = get_balance(user_id) + amount
    supabase.table("users").update({"leaves": balance}).eq("id", user_id).execute()
    supabase.table("leaf_logs").insert(
        {"user_id": user_id, "amount": amount, "reason": reason}
    ).execute()
    return balance


def review_reward(comment: str | None, tag_count: int) -> int:
    bonus = REVIEW_BONUS if (comment and len(comment.strip()) >= 10 and tag_count > 0) else 0
    return REVIEW_REWARD + bonus


def ensure_backfill(user_id: str) -> int:
    """기능 도입 전에 쓴 리뷰를 소급 적립 (1회). 적립된 잎 수 반환.

    이미 보상받은 리뷰 수(review:* 로그)와 실제 리뷰 수의 차이만큼 지급하므로
    여러 번 불려도 중복 지급되지 않는다.
    """
    logs = (
        supabase.table("leaf_logs")
        .select("reason")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if any(l["reason"] == "retro" for l in logs):
        return 0
    awarded = sum(1 for l in logs if l["reason"].startswith("review:"))
    total = (
        supabase.table("reviews")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
        .count
        or 0
    )
    missing = total - awarded
    if missing <= 0:
        # 소급할 게 없어도 마커는 남겨 다음부터 조회 1번으로 끝나게
        supabase.table("leaf_logs").insert(
            {"user_id": user_id, "amount": 0, "reason": "retro"}
        ).execute()
        return 0
    amount = missing * REVIEW_REWARD
    adjust(user_id, amount, "retro")
    return amount
