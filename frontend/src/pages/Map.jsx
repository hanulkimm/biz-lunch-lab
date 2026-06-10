// 메인 지도 — 카카오 지도 풀스크린 + 헤더 + 마커 클릭 시 식당 패널.
import { useEffect, useState } from "react";

import { getRestaurants } from "../api/restaurants";
import KakaoMap from "../components/Map/KakaoMap";
import RestaurantPanel from "../components/RestaurantPanel/RestaurantPanel";
import { useAuthStore } from "../store/authStore";
import "./map.css";

export default function Map() {
  const { user, logout } = useAuthStore();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    getRestaurants().then(setRestaurants).catch(() => {});
  }, []);

  return (
    <div className="map-page">
      <header className="map-header">
        <span className="brand">🍱 Biz Lunch Lab</span>
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
        <KakaoMap restaurants={restaurants} onMarkerClick={(r) => setSelectedId(r.id)} />
        <RestaurantPanel restaurantId={selectedId} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  );
}
