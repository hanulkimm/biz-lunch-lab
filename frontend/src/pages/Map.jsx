// 메인 지도 — 동물의 숲 톤 헤더 + 카카오 지도 + 식당/챗봇 패널.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dices, MapPin, Navigation, Pencil, Sparkles, UsersRound } from "lucide-react";

import { getRestaurants } from "../api/restaurants";
import ChatPanel from "../components/ChatPanel/ChatPanel";
import KakaoMap from "../components/Map/KakaoMap";
import RestaurantPanel from "../components/RestaurantPanel/RestaurantPanel";
import { useAuthStore } from "../store/authStore";
import "./map.css";

export default function Map() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    getRestaurants().then(setRestaurants).catch(() => {});
  }, []);

  const showMap = () => {
    setChatOpen(false);
    setSelectedId(null);
  };

  return (
    <div className="map-page">
      <header className="map-header">
        <div className="mh-brand">
          <span className="leaf-logo" aria-hidden="true" />
          <span>비즈런치랩</span>
        </div>

        <nav className="mh-nav">
          <button className={!chatOpen ? "active" : ""} onClick={showMap}>
            <MapPin size={15} /> 지도
          </button>
          <button
            className={chatOpen ? "active" : ""}
            onClick={() => {
              setChatOpen(true);
              setSelectedId(null);
            }}
          >
            <Sparkles size={15} /> AI
          </button>
          <button onClick={() => alert("메뉴 룰렛은 곧 추가돼요! 🎲")}>
            <Dices size={15} /> 룰렛
          </button>
          <button onClick={() => alert("랜덤 런치는 곧 추가돼요! 🍱")}>
            <UsersRound size={15} /> 런치
          </button>
        </nav>

        <div className="mh-spacer" />

        <button className="mh-review" onClick={() => navigate("/review/write")}>
          <Pencil size={15} /> 리뷰 쓰기
        </button>
        {user?.is_admin && <span className="mh-admin">관리자</span>}
        <div className="mh-avatar">{user?.name?.[0] || "주"}</div>
      </header>

      <div className="map-body">
        <KakaoMap
          restaurants={restaurants}
          onMarkerClick={(r) => {
            setSelectedId(r.id);
            setChatOpen(false);
          }}
        />
        <div className="map-region">
          <Navigation size={14} /> 광화문 마을
        </div>
        <RestaurantPanel restaurantId={selectedId} onClose={() => setSelectedId(null)} />
        {chatOpen && <ChatPanel userName={user?.name} onClose={() => setChatOpen(false)} />}
      </div>
    </div>
  );
}
