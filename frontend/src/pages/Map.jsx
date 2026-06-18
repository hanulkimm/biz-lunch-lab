// 메인 — 상단 헤더 + 동물의 숲 게임 카드(리본 + 지도, AI 탭으로 또리 챗봇 토글).
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MapPin, Moon, Sun } from "lucide-react";

import { getRestaurants } from "../api/restaurants";
import AppHeader from "../components/common/AppHeader";
import ChatPanel from "../components/ChatPanel/ChatPanel";
import KakaoMap from "../components/Map/KakaoMap";
import MapSearch from "../components/Map/MapSearch";
import RestaurantPanel from "../components/RestaurantPanel/RestaurantPanel";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import "./map.css";

export default function Map() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedId, setSelectedId] = useState(location.state?.focusId || null);
  const [chatOpen, setChatOpen] = useState(!!location.state?.openChat);
  const [searchKey, setSearchKey] = useState(0); // 검색창 초기화용 remount 키

  useEffect(() => {
    getRestaurants().then(setRestaurants).catch(() => {});
  }, []);

  // 상단 "지도" 탭 클릭 — 열린 패널(챗봇/상세) + 검색을 모두 닫고 지도만 보이게.
  const resetToMap = () => {
    setChatOpen(false);
    setSelectedId(null);
    setSearchKey((k) => k + 1);
  };

  return (
    <div className="gw-page">
      <AppHeader
        active="map"
        aiOpen={chatOpen}
        onAi={() => setChatOpen(true)}
        onMap={resetToMap}
      />

      <div className="gw-wrap">
        <div className="game-card">
          <div className="gc-sea" />
          <div className="gc-zigzag" />
          <button
            className={`gc-sun${theme === "dark" ? " moon" : ""}`}
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
          >
            {theme === "dark" ? <Moon size={24} /> : <Sun size={24} />}
          </button>

          <div className="ribbon">
            <div className="ribbon-inner">
              <MapPin size={28} />
              <span>광화문 일대</span>
            </div>
          </div>

          <div className="gc-body">
            <div className="map-col">
              <div className="map-card">
                <KakaoMap
                  restaurants={restaurants}
                  selectedId={selectedId}
                  onPinClick={(r) => setSelectedId(r.id)}
                />
                <MapSearch
                  key={searchKey}
                  restaurants={restaurants}
                  onSelect={(id) => setSelectedId(id)}
                />
                <RestaurantPanel restaurantId={selectedId} onClose={() => setSelectedId(null)} />
              </div>
            </div>

            {chatOpen && (
              <ChatPanel
                userName={user?.name}
                onClose={() => setChatOpen(false)}
                onFocusRestaurant={(id) => setSelectedId(id)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
