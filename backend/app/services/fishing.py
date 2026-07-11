"""청계천 낚시터 — 실제 월·시각(KST) 기반 어종 추첨 + 낚기 검증 + 도감/판매.

치트 방지 설계: 어떤 물고기가 무는지는 서버가 캐스팅 시점에 결정하고,
서명된 토큰(JWT)으로 클라이언트에 전달한다. 클라이언트는 타이밍 미니게임만
수행하고, 성공하면 토큰을 다시 보내 낚은 것을 확정(land)한다.
"""
import random
import time
import uuid
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from jose import JWTError, jwt

from app.config import settings
from app.database import supabase
from app.services import leaf_economy as leaf

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "fish.json"
FISH: list[dict] = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
BY_ID: dict[str, dict] = {f["id"]: f for f in FISH}

KST = ZoneInfo("Asia/Seoul")
TOKEN_TTL = 90          # 캐스팅 토큰 유효시간(초) — 미니게임 한 판이면 충분

# 난이도 → 진짜 입질 반응 허용시간(ms). 어려운 물고기일수록 짧다.
BITE_WINDOW = {
    "Very Easy": 950, "Easy": 850, "Medium": 750, "Hard": 600, "Very Hard": 480,
}

# 재사용(리플레이) 방지 — 사용된 토큰 jti 보관 (단일 컨테이너라 메모리로 충분)
_used_jti: dict[str, float] = {}


def _purge_jti():
    cutoff = time.time() - TOKEN_TTL * 2
    for k in [k for k, t in _used_jti.items() if t < cutoff]:
        _used_jti.pop(k, None)


def available_fish(now: datetime | None = None) -> list[dict]:
    now = now or datetime.now(KST)
    return [f for f in FISH if now.month in f["months"] and now.hour in f["hours"]]


def _card(f: dict) -> dict:
    return {
        "id": f["id"], "name_ko": f["name_ko"], "name": f["name"],
        "price": f["price"], "shadow": f["shadow"], "shadow_ko": f["shadow_ko"],
        "months_label": f["months_label"], "time_label": f["time_label"],
        "habitat": f["habitat"], "icon": f["icon"], "image": f["image"],
    }


def pond_status() -> dict:
    now = datetime.now(KST)
    avail = available_fish(now)
    return {
        "hour": now.hour,
        "month": now.month,
        "available_count": len(avail),
        "total_count": len(FISH),
    }


def cast(user_id: str) -> dict:
    """어종 추첨 + 서명 토큰 발급. 입질 연출 파라미터도 함께 반환."""
    avail = available_fish()
    if not avail:
        return {"bite": False, "message": "지금은 물고기가 활동하지 않는 시간이에요…"}

    fish = random.choices(avail, weights=[f["rate"] for f in avail], k=1)[0]
    jti = uuid.uuid4().hex
    token = jwt.encode(
        {
            "typ": "cast",
            "sub": user_id,
            "fish": fish["id"],
            "jti": jti,
            "exp": int(time.time()) + TOKEN_TTL,
        },
        settings.jwt_secret_key,
        algorithm="HS256",
    )
    return {
        "bite": True,
        "token": token,
        "shadow": fish["shadow"],
        "shadow_ko": fish["shadow_ko"],
        "nibbles": random.randint(0, 3),                       # 페이크 입질 횟수
        "bite_window_ms": BITE_WINDOW.get(fish["difficulty"], 750),
    }


def land(user_id: str, token: str) -> dict:
    """타이밍 성공 → 토큰 검증 후 도감/주머니에 기록."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
    except JWTError:
        raise ValueError("찌가 이미 가라앉았어요. 다시 던져주세요!")
    if payload.get("typ") != "cast" or payload.get("sub") != user_id:
        raise ValueError("낚싯대가 꼬였어요. 다시 던져주세요!")
    jti = payload.get("jti", "")
    _purge_jti()
    if jti in _used_jti:
        raise ValueError("이미 낚은 물고기예요!")
    _used_jti[jti] = time.time()

    fish = BY_ID.get(payload.get("fish"))
    if fish is None:
        raise ValueError("물고기가 도망갔어요…")

    # 도감 upsert (user_id + fish_id 유니크)
    existing = (
        supabase.table("user_fish")
        .select("id, count")
        .eq("user_id", user_id)
        .eq("fish_id", fish["id"])
        .limit(1)
        .execute()
        .data
    )
    if existing:
        new_count = existing[0]["count"] + 1
        supabase.table("user_fish").update(
            {"count": new_count, "last_caught_at": "now()"}
        ).eq("id", existing[0]["id"]).execute()
        is_new = False
    else:
        supabase.table("user_fish").insert(
            {"user_id": user_id, "fish_id": fish["id"], "count": 1}
        ).execute()
        new_count = 1
        is_new = True

    return {"fish": _card(fish), "count": new_count, "new": is_new}


def collection(user_id: str) -> dict:
    """도감: 전체 어종 + 보유 수량. 잎 잔액도 함께 (판매 UI용)."""
    rows = (
        supabase.table("user_fish")
        .select("fish_id, count, first_caught_at")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    owned = {r["fish_id"]: r["count"] for r in rows}
    entries = []
    for f in sorted(FISH, key=lambda x: -x["rate"]):
        entries.append({**_card(f), "count": owned.get(f["id"], 0), "caught": f["id"] in owned})
    return {
        "fish": entries,
        "caught_count": len(owned),
        "total_count": len(FISH),
        "leaves": leaf.get_balance(user_id),
    }


def sell(user_id: str, fish_id: str, count: int) -> dict:
    fish = BY_ID.get(fish_id)
    if fish is None:
        raise ValueError("없는 물고기예요.")
    row = (
        supabase.table("user_fish")
        .select("id, count")
        .eq("user_id", user_id)
        .eq("fish_id", fish_id)
        .limit(1)
        .execute()
        .data
    )
    have = row[0]["count"] if row else 0
    if have < count or count < 1:
        raise ValueError("팔 수 있는 만큼만 팔 수 있어요.")

    remaining = have - count
    if remaining > 0:
        supabase.table("user_fish").update({"count": remaining}).eq("id", row[0]["id"]).execute()
    else:
        # 도감 기록(caught 여부)은 남기고 싶으므로 count=0으로 보존
        supabase.table("user_fish").update({"count": 0}).eq("id", row[0]["id"]).execute()

    earned = fish["price"] * count
    balance = leaf.adjust(user_id, earned, f"fish:{fish_id}x{count}")
    return {"earned": earned, "leaves": balance, "remaining": remaining}
