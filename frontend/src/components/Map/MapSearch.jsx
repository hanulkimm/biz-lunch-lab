// 지도 위 식당 검색 — 카카오 로컬 API로 광화문 권역 음식점을 실검색해 선택.
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { searchKakao } from "../../api/restaurants";

export default function MapSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // 입력 디바운스 후 카카오 검색 호출
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    const t = setTimeout(() => {
      searchKakao(q)
        .then((data) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (place) => {
    onSelect?.(place);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="map-search">
      <div className="ms-bar">
        <Search size={16} className="ms-icon" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="맛집 이름·종류로 검색 (광화문)"
          aria-label="식당 검색"
        />
        {query && (
          <button className="ms-clear" onClick={() => setQuery("")} aria-label="지우기">
            <X size={15} />
          </button>
        )}
      </div>

      {open && (
        <ul className="ms-results">
          {loading ? (
            <li className="ms-empty">찾는 중… 🔎</li>
          ) : results.length === 0 ? (
            <li className="ms-empty">검색 결과가 없어요 🌱</li>
          ) : (
            results.map((r) => (
              <li key={r.kakao_place_id}>
                <button className="ms-item" onClick={() => pick(r)}>
                  <span className="ms-item-main">
                    <span className="ms-item-name">{r.name}</span>
                    {(r.road_address || r.address) && (
                      <span className="ms-item-addr">{r.road_address || r.address}</span>
                    )}
                  </span>
                  {r.category && (
                    <span className="ms-item-meta">
                      <span className="ms-item-cat">{r.category.split(">").pop().trim()}</span>
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
