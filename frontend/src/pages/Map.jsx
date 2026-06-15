// 메인 — 동물의 숲 게임 카드: 리본 배너 + (AC 톤 지도 ‖ 또리 챗봇) + 하단 네비.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, MapPin, Pencil } from "lucide-react";

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

  useEffect(() => {
    getRestaurants().then(setRestaurants).catch(() => {});
  }, []);

  return (
    <div className="gw-page">
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

            <ChatPanel userName={user?.name} onFocusRestaurant={(id) => setSelectedId(id)} />
          </div>

          <div className="gc-hint">
            <div className="pills">
              <button className="hint-pill review" onClick={() => navigate("/review/write")}>
                <Pencil size={15} /> 리뷰 쓰기
              </button>
              <button className="hint-pill" onClick={logout}>
                <LogOut size={15} /> 로그아웃
              </button>
            </div>
            <div className="gc-who">
              {user?.name}
              {user?.is_admin && <span className="gc-admin">관리자</span>}
            </div>
          </div>
        </div>

        <p className="gw-caption">
          실제 카카오 지도 위에 색감 보정 · 따뜻한 워시 · 말랑 핀 · 잎새 소품을 얹어 동물의 숲 톤으로 맞췄어요.
        </p>
      </div>
    </div>
  );
}
