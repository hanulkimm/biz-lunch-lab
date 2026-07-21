// 지도 진입 시 1회 뜨는 공지 팝업 — 회원가입/로그인 개편 안내. 닫으면 다시 뜨지 않음.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import "./noticemodal.css";

const STORAGE_KEY = "notice_open_signup_v2_dismissed";

export default function NoticeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="notice-bg" onClick={close}>
      <div className="notice" onClick={(e) => e.stopPropagation()}>
        <button className="notice-x" onClick={close} aria-label="닫기"><X size={18} /></button>

        <div className="notice-badge">📢 안내</div>
        <h2 className="notice-title">회원가입이 더 쉬워졌어요!</h2>

        <ul className="notice-list">
          <li>
            <span className="e">🪪</span>
            <div>
              <b>이름 + PIN 4자리</b>만으로 누구나 가입·로그인할 수 있어요.
              <small>본부 제한이 없어졌어요 — 다른 본부 동료도 환영합니다.</small>
            </div>
          </li>
          <li>
            <span className="e">🏢</span>
            <div>
              부문·본부·담당·팀 같은 <b>소속 정보</b>는 가입 후
              <b> 마이페이지</b>에서 각자 입력할 수 있어요.
            </div>
          </li>
          <li>
            <span className="e">🌿</span>
            <div>
              기존에 등록한 주민과 기록은 <b>그대로 유지</b>돼요.
            </div>
          </li>
        </ul>

        <button className="notice-ok btn-leaf" onClick={close}>알겠어요, 둘러볼게요</button>
      </div>
    </div>
  );
}
