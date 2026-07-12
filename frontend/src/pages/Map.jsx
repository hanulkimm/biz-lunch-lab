// 메인 — 상단 헤더 + 동물의 숲 게임 카드(리본 + 지도, AI 탭으로 또리 챗봇 토글).
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapPin, Moon, Sun } from "lucide-react";

import { getRestaurants } from "../api/restaurants";
import AppHeader from "../components/common/AppHeader";
import LoginRequiredDialog from "../components/common/LoginRequiredDialog";
import ChatPanel from "../components/ChatPanel/ChatPanel";
import KakaoMap from "../components/Map/KakaoMap";
import MapSearch from "../components/Map/MapSearch";
import RestaurantPanel from "../components/RestaurantPanel/RestaurantPanel";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import "./map.css";

export default function Map() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [restaurants, setRestaurants] = useState([]);
  const [selected, setSelected] = useState(null); // 선택한 식당(검색 결과/마커) place 객체
  const [chatOpen, setChatOpen] = useState(!!location.state?.openChat);
  const [fishingGate, setFishingGate] = useState(false); // 비로그인 낚시터 클릭 안내
  const [searchKey, setSearchKey] = useState(0); // 검색창 초기화용 remount 키

  const focusId = location.state?.focusId; // 룰렛/런치/챗봇에서 넘어온 DB 식당 id
  const focusPlace = location.state?.focusPlace; // 룰렛 "새로운 발견" — DB에 없는 카카오 place

  // 지도 페이지에서는 페이지 스크롤바를 감춘다(스크롤 기능은 유지).
  // 스크롤 컨테이너가 html(documentElement)이므로 양쪽 모두에 적용.
  useEffect(() => {
    document.documentElement.classList.add("map-noscroll");
    document.body.classList.add("map-noscroll");
    return () => {
      document.documentElement.classList.remove("map-noscroll");
      document.body.classList.remove("map-noscroll");
    };
  }, []);

  useEffect(() => {
    getRestaurants()
      .then((list) => {
        setRestaurants(list);
        if (focusId) {
          const found = list.find((r) => r.id === focusId);
          if (found) setSelected(found);
        }
      })
      .catch(() => {});
  }, [focusId]);

  // 룰렛 발굴 식당 — DB 목록과 무관하게 좌표/카카오 정보로 바로 포커스
  useEffect(() => {
    if (focusPlace?.latitude != null) setSelected(focusPlace);
  }, [focusPlace]);

  // 챗봇 추천 카드 클릭 → 지도 포커스.
  // 리뷰 있는 DB 식당이면 마커로, 신규 발견(카카오) 식당이면 좌표/카카오정보로 포커스.
  const focusFromChat = (card) => {
    if (!card) return;
    const dbMatch = restaurants.find((x) => x.id === card.id);
    if (dbMatch) {
      setSelected(dbMatch);
      return;
    }
    if (card.latitude != null && card.longitude != null) {
      setSelected({
        kakao_place_id: card.kakao_place_id,
        name: card.name,
        category: card.category,
        address: card.address,
        road_address: card.road_address,
        latitude: card.latitude,
        longitude: card.longitude,
        kakao_url: card.kakao_url,
      });
    }
  };

  // 상단 "지도" 탭 클릭 — 열린 패널(챗봇/상세) + 검색을 모두 닫고 지도만 보이게.
  const resetToMap = () => {
    setChatOpen(false);
    setSelected(null);
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

          <div className={`gc-body${chatOpen ? " chat-open" : ""}`}>
            <div className="map-col">
              <div className="map-card">
                <KakaoMap
                  restaurants={restaurants}
                  selected={selected}
                  onPinClick={(r) => setSelected(r)}
                  onFishingClick={() =>
                    token ? navigate("/fishing") : setFishingGate(true)
                  }
                />
                <MapSearch
                  key={searchKey}
                  onSelect={(place) => setSelected(place)}
                />
                <RestaurantPanel
                  place={selected}
                  onClose={() => setSelected(null)}
                  onWriteReview={(place) => navigate("/review/write", { state: { place } })}
                />
              </div>
            </div>

            {chatOpen && (
              <ChatPanel
                userName={user?.name}
                onClose={() => setChatOpen(false)}
                onFocusRestaurant={focusFromChat}
              />
            )}
          </div>
        </div>
      </div>

      {fishingGate && (
        <LoginRequiredDialog
          feature="청계천 낚시터"
          target="/fishing"
          onCancel={() => setFishingGate(false)}
        />
      )}
    </div>
  );
}
