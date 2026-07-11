"""room 라우터 — 너굴상점 카탈로그 / 내 방 / 구매 / 레이아웃 저장."""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import supabase
from app.models.schemas import RoomBuy, RoomLayoutSave
from app.services import leaf_economy as leaf

router = APIRouter()


def _owned_ids(user_id: str) -> set[str]:
    rows = supabase.table("user_items").select("item_id").eq("user_id", user_id).execute().data
    return {r["item_id"] for r in rows}


@router.get("/catalog")
def catalog(user: dict = Depends(get_current_user)):
    return leaf.CATALOG


@router.get("/me")
def my_room(user: dict = Depends(get_current_user)):
    backfilled = leaf.ensure_backfill(user["id"])
    room = (
        supabase.table("user_rooms").select("layout").eq("user_id", user["id"]).limit(1).execute().data
    )
    return {
        "leaves": leaf.get_balance(user["id"]),
        "backfilled": backfilled,          # 이번에 소급 적립된 잎 (첫 방문 연출용)
        "items": sorted(_owned_ids(user["id"])),
        "layout": room[0]["layout"] if room else {},
    }


@router.post("/buy")
def buy(body: RoomBuy, user: dict = Depends(get_current_user)):
    item = leaf.BY_ID.get(body.item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="상점에 없는 아이템이에요.")
    if body.item_id in _owned_ids(user["id"]):
        raise HTTPException(status_code=409, detail="이미 가지고 있는 아이템이에요.")
    balance = leaf.get_balance(user["id"])
    if balance < item["price"]:
        raise HTTPException(status_code=400, detail="나뭇잎이 부족해요. 리뷰를 남기면 잎이 쌓여요! 🍃")

    supabase.table("user_items").insert(
        {"user_id": user["id"], "item_id": body.item_id}
    ).execute()
    new_balance = leaf.adjust(user["id"], -item["price"], f"buy:{body.item_id}")
    return {"leaves": new_balance, "item_id": body.item_id}


@router.put("/layout")
def save_layout(body: RoomLayoutSave, user: dict = Depends(get_current_user)):
    layout = body.layout
    owned = _owned_ids(user["id"])

    # 배치된 아이템은 전부 보유 중이어야 함
    placed: list[str] = []
    placed += [it.get("id") for it in layout.get("floor_items", [])]
    placed += [it.get("id") for it in layout.get("wall_items", [])]
    for key in ("wallpaper", "floor", "rug"):
        if layout.get(key):
            v = layout[key]
            placed.append(v.get("id") if isinstance(v, dict) else v)
    unknown = [p for p in placed if p not in owned or p not in leaf.BY_ID]
    if unknown:
        raise HTTPException(status_code=400, detail="보유하지 않은 아이템이 포함되어 있어요.")

    supabase.table("user_rooms").upsert(
        {"user_id": user["id"], "layout": layout, "updated_at": "now()"}
    ).execute()
    return {"saved": True}
