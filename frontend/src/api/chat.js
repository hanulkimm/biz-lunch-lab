// AI 챗봇 API 호출.
import client from "./client";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// 비스트리밍 (폴백용)
export const sendChat = (message, history) =>
  client.post("/api/chat", { message, history }).then((r) => r.data);

// SSE 스트리밍 — 에이전트 진행상태 + 답변 토큰을 콜백으로 전달.
// axios는 스트림을 못 받고 EventSource는 헤더를 못 실으므로 fetch + ReadableStream 사용.
export async function streamChat(message, history, { onStatus, onToken, onDone, onError } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE 이벤트는 "\n\n"로 구분. 마지막 미완성 조각은 버퍼에 남겨둔다.
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      let ev;
      try {
        ev = JSON.parse(data);
      } catch {
        continue;
      }
      if (ev.type === "status") onStatus?.(ev.text);
      else if (ev.type === "token") onToken?.(ev.text);
      else if (ev.type === "done") onDone?.(ev);
      else if (ev.type === "error") onError?.(ev);
    }
  }
}
