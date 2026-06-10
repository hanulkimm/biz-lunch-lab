// 카카오 지도 + 식당 마커. restaurants가 바뀌면 마커를 다시 그린다.
import { useEffect, useRef, useState } from "react";

import { loadKakao } from "./loadKakao";

const GWANGHWAMUN = { lat: 37.5759, lng: 126.9769 };

export default function KakaoMap({ restaurants = [], onMarkerClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [error, setError] = useState("");

  // 지도 초기화 (1회)
  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then((kakao) => {
        if (cancelled || mapRef.current) return;
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(GWANGHWAMUN.lat, GWANGHWAMUN.lng),
          level: 4,
        });
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // 마커 갱신
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    restaurants.forEach((r) => {
      if (r.latitude == null || r.longitude == null) return;
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(r.latitude, r.longitude),
        title: r.name,
      });
      marker.setMap(map);
      kakao.maps.event.addListener(marker, "click", () => onMarkerClick?.(r));
      markersRef.current.push(marker);
    });
  }, [restaurants, onMarkerClick]);

  if (error) {
    return (
      <div className="map-error">
        지도를 불러오지 못했습니다: {error}
        <br />
        (카카오 콘솔에 <code>http://localhost:5173</code> 도메인이 등록됐는지 확인하세요)
      </div>
    );
  }

  return <div ref={containerRef} className="map-container" />;
}
