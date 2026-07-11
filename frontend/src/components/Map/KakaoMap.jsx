// 카카오 지도 — 동물의 숲 톤(필터 + 워시 + 비네팅) + 말랑 물방울 핀(CustomOverlay).
import { useEffect, useRef, useState } from "react";
import { Minus, Navigation, Plus } from "lucide-react";

import { loadKakao } from "./loadKakao";

const GWANGHWAMUN = { lat: 37.5759, lng: 126.9769 };
// 청계광장(청계천 시작점) — 낚시터 입구
const CHEONGGYECHEON = { lat: 37.5687, lng: 126.9782 };

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>';

export default function KakaoMap({ restaurants = [], selected, onPinClick, onFishingClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  // 지도 초기화
  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then((kakao) => {
        if (cancelled || mapRef.current) return;
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(GWANGHWAMUN.lat, GWANGHWAMUN.lng),
          level: 4,
        });
        setReady(true);
      })
      .catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, []);

  // 청계천 낚시터 오버레이 (1회)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map || !ready) return;

    const el = document.createElement("div");
    el.className = "fishing-spot";
    el.innerHTML =
      '<div class="fs-pin">🎣</div><div class="fs-label">청계천 낚시터</div>';
    el.addEventListener("click", () => onFishingClick?.());

    const overlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(CHEONGGYECHEON.lat, CHEONGGYECHEON.lng),
      content: el,
      yAnchor: 1,
      zIndex: 4,
    });
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [ready, onFishingClick]);

  // 핀(물방울) 갱신
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const selKey = selected?.kakao_place_id;
    // 등록 마커 + (검색 등으로 고른) 선택 식당이 목록에 없으면 추가로 표시
    const list = [...restaurants];
    if (selected && !restaurants.some((r) => r.kakao_place_id === selKey)) {
      list.push(selected);
    }

    list.forEach((r) => {
      if (r.latitude == null || r.longitude == null) return;
      const isSel = r.kakao_place_id === selKey;

      const el = document.createElement("div");
      el.className = "pin" + (isSel ? " sel" : "");
      el.innerHTML =
        (isSel
          ? `<div class="pin-label">${r.name}${r.avg_rating ? " ★" + r.avg_rating : ""}</div>`
          : "") + `<div class="pin-drop">${PIN_SVG}</div>`;
      el.addEventListener("click", () => onPinClick?.(r));

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(r.latitude, r.longitude),
        content: el,
        yAnchor: 1,
        zIndex: isSel ? 5 : 3,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });
  }, [restaurants, selected, onPinClick, ready]);

  // 선택 식당으로 부드럽게 이동
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selected?.latitude == null) return;
    map.panTo(new window.kakao.maps.LatLng(selected.latitude, selected.longitude));
  }, [selected]);

  const zoom = (delta) => {
    const map = mapRef.current;
    if (map) map.setLevel(map.getLevel() + delta, { animate: true });
  };

  if (error) {
    return (
      <div className="map-error">
        지도를 불러오지 못했어요: {error}
        <br />
        (카카오 콘솔에 <code>http://localhost:5173</code> 도메인이 등록됐는지 확인하세요)
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="map-container" />
      <div className="map-wash" />
      <div className="map-vignette" />
      <div className="map-region">
        <Navigation size={14} /> 광화문 마을
      </div>
      <div className="map-zoom">
        <button onClick={() => zoom(-1)} aria-label="확대"><Plus size={18} /></button>
        <button onClick={() => zoom(1)} aria-label="축소"><Minus size={18} /></button>
      </div>
    </>
  );
}
