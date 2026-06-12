// AI 맛집 검색 챗봇 — "런치 요정" 캐릭터. 대화는 세션 동안만 유지.
import { useRef, useState } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";

import { sendChat } from "../../api/chat";

const SUGGESTIONS = ["가성비 점심", "조용한 회식", "빨리 나오는 곳"];

export default function ChatPanel({ userName, onClose }) {
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const scrollDown = () =>
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    scrollDown();

    try {
      const res = await sendChat(msg, history);
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "앗, 잠깐 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
      ]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  };

  return (
    <aside className="panel cp">
      <div className="cp-head">
        <div className="cp-fairy">
          <Sparkles size={21} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="cp-title">런치 요정</div>
          <div className="cp-status">동료들의 리뷰로 추천해요</div>
        </div>
        <button className="panel-close" onClick={onClose} aria-label="닫기">
          <X size={15} />
        </button>
      </div>

      <div className="cp-list" ref={listRef}>
        {/* 인사 */}
        <div className="cp-row">
          <div className="ava"><Sparkles size={14} /></div>
          <div className="cp-bubble">
            안녕하세요 {userName || "주민"}님! 🌿{"\n"}오늘은 어떤 점심을 찾으세요?
          </div>
        </div>

        {messages.length === 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 39 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{
                  padding: "8px 14px", borderRadius: 999, background: "#fff",
                  border: "2px solid var(--line)", color: "var(--ink)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="cp-user">{m.content}</div>
          ) : (
            <div key={i} className="cp-row">
              <div className="ava"><Sparkles size={14} /></div>
              <div className="cp-bubble">{m.content}</div>
            </div>
          )
        )}

        {loading && (
          <div className="cp-row">
            <div className="ava"><Sparkles size={14} /></div>
            <div className="cp-bubble">요정이 메뉴판을 넘기는 중… 🍃</div>
          </div>
        )}
      </div>

      <div className="cp-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="메시지를 입력하세요"
          disabled={loading}
        />
        <button className="cp-send" onClick={() => send()} disabled={loading} aria-label="전송">
          <ArrowUp size={19} />
        </button>
      </div>
    </aside>
  );
}
