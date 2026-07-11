"""fishing 라우터 — 청계천 낚시터 (캐스팅/낚기/도감/판매)."""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.models.schemas import FishingLand, FishingSell
from app.services import fishing

router = APIRouter()


@router.get("/pond")
def pond(user: dict = Depends(get_current_user)):
    return fishing.pond_status()


@router.post("/cast")
def cast(user: dict = Depends(get_current_user)):
    return fishing.cast(user["id"])


@router.post("/land")
def land(body: FishingLand, user: dict = Depends(get_current_user)):
    try:
        return fishing.land(user["id"], body.token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/collection")
def collection(user: dict = Depends(get_current_user)):
    return fishing.collection(user["id"])


@router.post("/sell")
def sell(body: FishingSell, user: dict = Depends(get_current_user)):
    try:
        return fishing.sell(user["id"], body.fish_id, body.count)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
