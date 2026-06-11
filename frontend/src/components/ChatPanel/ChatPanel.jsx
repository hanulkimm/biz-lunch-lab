// AI 맛집 검색 챗봇 패널. 대화 히스토리는 세션 동안 React state로만 유지(새로고침 시 초기화).
import { useRef, useState } from "react";

import { sendChat } from "../../api/chat";

export default function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([]); // {role, content, restaurants?}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const scrollDown = () =>
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    scrollDown();

    try {
      const res = await sendChat(text, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, restaurants: res.restaurants },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      ]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  };

  return (
    <aside className="panel chat-panel">
      <button className="panel-close" onClick={onClose}>
        ✕
      </button>
      <h2 className="panel-title">🤖 AI 맛집 검색</h2>
      <p className="chat-hint">등록된 리뷰를 바탕으로 추천해드려요.</p>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <p className="chat-empty">예: "조용하게 회식하기 좋은 한식집 추천해줘"</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="bubble">{m.content}</div>
          </div>
        ))}
        {loading && <div className="chat-msg assistant"><div className="bubble">…</div></div>}
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="메시지를 입력하세요"
          disabled={loading}
        />
        <button onClick={send} disabled={loading}>
          전송
        </button>
      </div>
    </aside>
  );
}
