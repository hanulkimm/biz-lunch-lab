// 메인 — 상단 헤더 + 동물의 숲 게임 카드(리본 + 지도, AI 탭으로 또리 챗봇 토글).
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { List, MapPin, Moon, Sun } from "lucide-react";

import { getRestaurants } from "../api/restaurants";
import AppHeader from "../components/common/AppHeader";
import LoginRequiredDialog from "../components/common/LoginRequiredDialog";
import NoticeModal from "../components/common/NoticeModal";
import SiteFooter from "../components/common/SiteFooter";
import ChatPanel from "../components/ChatPanel/ChatPanel";
import RestaurantListPanel from "../components/RestaurantList/RestaurantListPanel";
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
  const [listOpen, setListOpen] = useState(false); // 식당 목록 패널
  const [fishingGate, setFishingGate] = useState(false); // 비로그인 낚시터 클릭 안내
  const [searchKey, setSearchKey] = useState(0); // 검색창 초기화용 remount 키

  const focusId = location.state?.focusId; // 룰렛/런치/챗봇에서 넘어온 DB 식당 id
  const focusPlace = location.state?.focusPlace; // 룰렛 "새로운 발견" — DB에 없는 카카오 place

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

  // 상단 "지도" 탭 클릭 — 열린 패널(챗봇/식당목록/상세) + 검색을 모두 닫고 지도만 보이게.
  const resetToMap = () => {
    setChatOpen(false);
    setListOpen(false);
    setSelected(null);
    setSearchKey((k) => k + 1);
  };

  // 한 번에 하나의 사이드 패널만 — 챗봇/식당목록은 서로 배타적으로 연다.
  const openChatPanel = () => {
    setListOpen(false);
    setChatOpen(true);
  };
  const toggleListPanel = () => {
    setChatOpen(false);
    setListOpen((v) => !v);
  };

  return (
    <>
    <div className="gw-page map-page">
      <AppHeader
        active="map"
        aiOpen={chatOpen}
        onAi={openChatPanel}
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

          <div className={`gc-body${chatOpen || listOpen ? " chat-open" : ""}`}>
            <div className="map-col">
              <div className="map-card">
                <button
                  className={`map-listbtn${listOpen ? " active" : ""}`}
                  onClick={toggleListPanel}
                  aria-label="식당 목록 보기"
                >
                  <List size={16} /> 식당 목록
                </button>
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

            {listOpen && (
              <RestaurantListPanel
                restaurants={restaurants}
                onClose={() => setListOpen(false)}
                onSelect={(r) => setSelected(r)}
              />
            )}
          </div>
        </div>
      </div>
    </div>

    <SiteFooter />

    <NoticeModal />

    {fishingGate && (
      <LoginRequiredDialog
        feature="청계천 낚시터"
        target="/fishing"
        onCancel={() => setFishingGate(false)}
      />
    )}
    </>
  );
}
