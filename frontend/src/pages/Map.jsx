// 메인 — 상단 헤더 + 동물의 숲 게임 카드(리본 + 지도, AI 탭으로 또리 챗봇 토글).
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MapPin } from "lucide-react";

import { getRestaurants } from "../api/restaurants";
import AppHeader from "../components/common/AppHeader";
import ChatPanel from "../components/ChatPanel/ChatPanel";
import KakaoMap from "../components/Map/KakaoMap";
import RestaurantPanel from "../components/RestaurantPanel/RestaurantPanel";
import { useAuthStore } from "../store/authStore";
import "./map.css";

export default function Map() {
  const location = useLocation();
  const { user } = useAuthStore();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedId, setSelectedId] = useState(location.state?.focusId || null);
  const [chatOpen, setChatOpen] = useState(!!location.state?.openChat);

  useEffect(() => {
    getRestaurants().then(setRestaurants).catch(() => {});
  }, []);

  return (
    <div className="gw-page">
      <AppHeader active="map" aiOpen={chatOpen} onAi={() => setChatOpen(true)} />

      <div className="gw-wrap">
        <div className="game-card">
          <div className="gc-sea" />
          <div className="gc-zigzag" />
          <div className="gc-sun" />
          <div className="gc-leaf" />

          <div className="ribbon">
            <div className="ribbon-inner">
              <MapPin size={19} color="#8A5A00" />
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
                <div className="gc-foliage"><i /><i /></div>
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
