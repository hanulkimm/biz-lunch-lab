"""chat 라우터 — AI 맛집 추천 챗봇 (RAG)."""
from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.models.schemas import ChatRequest
from app.services import rag_service

router = APIRouter()


@router.post("")
def chat(body: ChatRequest, _: dict = Depends(get_current_user)):
    history = [m.model_dump() for m in body.history]
    return rag_service.answer(body.message, history)
