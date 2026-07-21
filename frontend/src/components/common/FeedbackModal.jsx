// 건의하기 모달 — 방문자가 수정 요청·기능 제안을 제작자에게 보낸다. 익명/실명 모두 가능.
import { useState } from "react";
import { X } from "lucide-react";

import { sendFeedback } from "../../api/feedback";
import { useAuthStore } from "../../store/authStore";
import "./noticemodal.css";

export default function FeedbackModal({ onClose }) {
  const { user } = useAuthStore();
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const c = content.trim();
    if (!c) {
      setError("내용을 입력해주세요.");
      return;
    }
    setSending(true);
    setError("");
    try {
      // 비로그인은 항상 익명, 로그인은 체크박스에 따라.
      await sendFeedback(c, !user || anonymous);
      setDone(true);
    } catch {
      setError("전송에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="notice-bg" onClick={onClose}>
      <div className="notice" onClick={(e) => e.stopPropagation()}>
        <button className="notice-x" onClick={onClose} aria-label="닫기"><X size={18} /></button>

        {done ? (
          <div className="fb-done">
            <div className="fb-done-e">🌿</div>
            <h2 className="notice-title">보내주셔서 고마워요!</h2>
            <p className="fb-sub">소중한 의견은 제작자에게 잘 전달됐어요.</p>
            <button className="notice-ok btn-leaf" onClick={onClose}>닫기</button>
          </div>
        ) : (
          <>
            <div className="notice-badge">💌 건의하기</div>
            <h2 className="notice-title">이런 점을 남겨주세요</h2>
            <p className="fb-sub">
              고치면 좋을 점, 추가했으면 하는 기능 무엇이든 좋아요.
            </p>

            <textarea
              className="fb-textarea"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 2000))}
              placeholder="자유롭게 남겨주세요 :)"
              autoFocus
            />

            {user && (
              <label className="fb-anon">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                익명으로 보내기
              </label>
            )}

            {error && <p className="fb-error">{error}</p>}

            <button className="notice-ok btn-leaf" onClick={submit} disabled={sending}>
              {sending ? "보내는 중…" : "보내기"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
