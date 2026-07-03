"""chat 라우터 — AI 맛집 추천 챗봇 (Tool Use 에이전트)."""
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest
from app.services import rag_service

router = APIRouter()


@router.post("")
def chat(body: ChatRequest):
    history = [m.model_dump() for m in body.history]
    return rag_service.answer(body.message, history)


@router.post("/stream")
def chat_stream(body: ChatRequest):
    """SSE 스트리밍 — 에이전트 진행상태 + 최종 안내문을 토큰 단위로 전송."""
    history = [m.model_dump() for m in body.history]

    def event_source():
        try:
            for event in rag_service.answer_stream(body.message, history):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception:
            err = {"type": "error", "message": "앗, 잠깐 문제가 생겼어요."}
            yield f"data: {json.dumps(err, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
