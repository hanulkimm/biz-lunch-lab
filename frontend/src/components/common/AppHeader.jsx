// 공용 상단 헤더 (동물의 숲 톤) — 로고 + 섹션 탭 + 리뷰쓰기 + 아바타 + 로그아웃.
import { useNavigate } from "react-router-dom";
import { Dices, LogOut, MapPin, Pencil, Settings, Sparkles, UserRound, UsersRound } from "lucide-react";

import { useAuthStore } from "../../store/authStore";
import "./appheader.css";

export default function AppHeader({ active, aiOpen = false, onAi }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleAi = () => {
    if (onAi) onAi();
    else navigate("/map", { state: { openChat: true } });
  };

  const tab = (key, label, Icon, onClick, isActive) => (
    <button className={isActive ? "ah-tab active" : "ah-tab"} onClick={onClick}>
      <Icon size={15} /> {label}
    </button>
  );

  return (
    <header className="ah">
      <div className="ah-inner">
        <div className="ah-brand" onClick={() => navigate("/map")}>
          <span className="leaf-logo" aria-hidden="true" />
          <span>비즈런치랩</span>
        </div>

        <nav className="ah-nav">
          {tab("map", "지도", MapPin, () => navigate("/map"), active === "map" && !aiOpen)}
          {tab("ai", "AI", Sparkles, handleAi, aiOpen)}
          {tab("roulette", "룰렛", Dices, () => navigate("/roulette"), active === "roulette")}
          {tab("lunch", "런치", UsersRound, () => navigate("/lunch"), active === "lunch")}
          {tab("mypage", "마이페이지", UserRound, () => navigate("/mypage"), active === "mypage")}
          {user?.is_admin &&
            tab("admin", "관리자", Settings, () => navigate("/admin"), active === "admin")}
        </nav>

        <div className="ah-spacer" />

        <button className="ah-review" onClick={() => navigate("/review/write")}>
          <Pencil size={15} /> 리뷰 쓰기
        </button>
        <div className="ah-avatar">{user?.name?.[0] || "주"}</div>
        {user?.is_admin && <span className="ah-admin">관리자</span>}
        <button className="ah-logout" onClick={logout} aria-label="로그아웃">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
