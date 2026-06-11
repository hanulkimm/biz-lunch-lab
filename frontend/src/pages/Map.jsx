// 메인 지도 — 카카오 지도 풀스크린 + 헤더 + 마커 클릭 식당 패널 + AI 챗봇 패널.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getRestaurants } from "../api/restaurants";
import ChatPanel from "../components/ChatPanel/ChatPanel";
import KakaoMap from "../components/Map/KakaoMap";
import RestaurantPanel from "../components/RestaurantPanel/RestaurantPanel";
import { useAuthStore } from "../store/authStore";
import "./map.css";

export default function Map() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    getRestaurants().then(setRestaurants).catch(() => {});
  }, []);

  return (
    <div className="map-page">
      <header className="map-header">
        <span className="brand">🍱 Biz Lunch Lab</span>
        <button
          className="nav-btn"
          onClick={() => {
            setChatOpen((v) => !v);
            setSelectedId(null);
          }}
        >
          🤖 AI 검색
        </button>
        <button className="nav-btn" onClick={() => navigate("/review/write")}>
          ✍️ 리뷰 쓰기
        </button>
        <span className="spacer" />
        <span className="who">
          {user?.name}
          {user?.is_admin && <span className="admin-badge">관리자</span>}
        </span>
        <button className="logout" onClick={logout}>
          로그아웃
        </button>
      </header>

      <div className="map-body">
        <KakaoMap
          restaurants={restaurants}
          onMarkerClick={(r) => {
            setSelectedId(r.id);
            setChatOpen(false);
          }}
        />
        <RestaurantPanel restaurantId={selectedId} onClose={() => setSelectedId(null)} />
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>
    </div>
  );
}
