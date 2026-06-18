// 공용 상단 헤더 (동물의 숲 톤) — 로고 + 섹션 탭 + 리뷰쓰기 + 아바타 + 로그아웃.
import { useNavigate } from "react-router-dom";
import { Dices, LogOut, MapPin, Moon, Pencil, Settings, Sparkles, Sun, UserRound, UsersRound } from "lucide-react";

import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import "./appheader.css";

export default function AppHeader({ active, aiOpen = false, onAi, onMap }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const handleAi = () => {
    if (onAi) onAi();
    else navigate("/map", { state: { openChat: true } });
  };

  // 지도 화면에서는 열린 패널을 닫고 지도만 보이게(onMap), 다른 화면에서는 /map으로 이동.
  const handleMap = () => {
    if (onMap) onMap();
    else navigate("/map");
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
          <img className="brand-logo" src="/kt_logo.png" alt="KT" />
          <span>BizLunchLab</span>
        </div>

        <nav className="ah-nav">
          {tab("map", "지도", MapPin, handleMap, active === "map" && !aiOpen)}
          {tab("ai", "AI챗봇", Sparkles, handleAi, aiOpen)}
          {tab("roulette", "룰렛", Dices, () => navigate("/roulette"), active === "roulette")}
          {tab("lunch", "랜덤런치", UsersRound, () => navigate("/lunch"), active === "lunch")}
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
        <button
          className="ah-theme"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="ah-logout" onClick={logout} aria-label="로그아웃">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
