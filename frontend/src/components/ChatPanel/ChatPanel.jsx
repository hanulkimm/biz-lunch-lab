// AI 맛집 추천 챗봇 "또리" — 지도 옆 상시 패널. 대화는 세션 동안만 유지.
import { useRef, useState } from "react";
import { ArrowUp, MapPin, Minus, Star } from "lucide-react";

import { sendChat } from "../../api/chat";
import Spinner from "../common/Spinner";

const SUGGESTIONS = ["가성비 점심", "조용한 룸", "빨리 나오는 곳"];

// 혹시 모델이 마크다운을 섞어 보내도 평문으로 깔끔하게 정리한다.
function toPlainText(text = "") {
  return text
    .replace(/^#{1,6}\s+/gm, "")               // 제목(#)
    .replace(/\*\*([^*]+)\*\*/g, "$1")          // 볼드(**)
    .replace(/__([^_]+)__/g, "$1")              // 볼드(__)
    .replace(/^[ \t]*[-*+]\s+/gm, "• ")        // 목록 기호 → •
    .replace(/\*([^*\n]+)\*/g, "$1")            // 이탤릭(*)
    .replace(/`([^`]+)`/g, "$1")                // 인라인 코드(`)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")    // 링크 [텍스트](url)
    .replace(/\n{3,}/g, "\n\n")                 // 과도한 빈 줄 정리
    .trim();
}

function Avatar({ small }) {
  return (
    <div className="ddori-ava" style={small ? { width: 30, height: 30 } : undefined}>
      <img src="/ddori.png" alt="또리" />
    </div>
  );
}

export default function ChatPanel({ userName, onFocusRestaurant, onClose }) {
  const [messages, setMessages] = useState([]); // {role, content, restaurants?}
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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, restaurants: res.restaurants || [] },
      ]);
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
    <aside className="chat-col">
      <div className="cp-head">
        <Avatar />
        <div style={{ flex: 1 }}>
          <div className="cp-title">또리<span className="dot" /></div>
          <div className="cp-status">광화문 일대 동료 리뷰로 추천해요</div>
        </div>
        <button className="panel-close" onClick={onClose} aria-label="채팅 닫기">
          <Minus size={15} />
        </button>
      </div>

      <div className="cp-list" ref={listRef}>
        <div className="cp-date"><span>오늘 · 점심 추천</span></div>

        <div className="cp-row">
          <Avatar small />
          <div className="cp-bubble">
            안녕하세요 {userName || "주민"}님! 🌿{"\n"}광화문 일대 어떤 점심을 찾으세요?
          </div>
        </div>

        {messages.length === 0 && (
          <div className="cp-chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="cp-user">{m.content}</div>
          ) : (
            <div key={i} className="cp-row">
              <Avatar small />
              <div style={{ maxWidth: "86%" }}>
                <div className="cp-bubble">{toPlainText(m.content)}</div>
                {(m.restaurants || []).map((r) => (
                  <button key={r.id} className="cp-rest" onClick={() => onFocusRestaurant?.(r.id)}>
                    <div className="cp-rest-head">
                      <div className="cp-rest-info">
                        {r.category && (
                          <span className="cp-rest-cat">{r.category.split(">").pop().trim()}</span>
                        )}
                        <span className="cp-rest-name">{r.name}</span>
                      </div>
                      {r.rating != null && (
                        <span className="cp-rest-rate">
                          <Star size={12} fill="currentColor" /> {r.rating}
                        </span>
                      )}
                    </div>
                    {r.reason && <p className="cp-rest-reason">“{r.reason}”</p>}
                    {(r.tags || []).length > 0 && (
                      <div className="cp-rest-tags">
                        {r.tags.map((t) => (
                          <span key={t} className="cp-rest-tag">{t}</span>
                        ))}
                      </div>
                    )}
                    <span className="cp-rest-go"><MapPin size={14} /> 지도에서 보기</span>
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="cp-row">
            <Avatar small />
            <div className="cp-bubble cp-loading">
              <Spinner size={15} /> 또리가 메뉴판을 넘기는 중…
            </div>
          </div>
        )}
      </div>

      <div className="cp-input">
        <div className="cp-input-row">
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
      </div>
    </aside>
  );
}
