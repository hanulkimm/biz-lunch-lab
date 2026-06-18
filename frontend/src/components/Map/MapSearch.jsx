// 지도 위 식당 검색 — 등록된(리뷰 있는) 식당을 이름/카테고리로 찾아 마커로 포커스.
import { useMemo, useState } from "react";
import { Search, Star, X } from "lucide-react";

export default function MapSearch({ restaurants = [], onSelect }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return restaurants
      .filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, restaurants]);

  const pick = (r) => {
    onSelect?.(r.id);
    setQuery("");
  };

  return (
    <div className="map-search">
      <div className="ms-bar">
        <Search size={16} className="ms-icon" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="맛집 이름·종류로 검색"
          aria-label="식당 검색"
        />
        {query && (
          <button className="ms-clear" onClick={() => setQuery("")} aria-label="지우기">
            <X size={15} />
          </button>
        )}
      </div>

      {query.trim() && (
        <ul className="ms-results">
          {results.length === 0 ? (
            <li className="ms-empty">검색 결과가 없어요 🌱</li>
          ) : (
            results.map((r) => (
              <li key={r.id}>
                <button className="ms-item" onClick={() => pick(r)}>
                  <span className="ms-item-name">{r.name}</span>
                  <span className="ms-item-meta">
                    {r.category && (
                      <span className="ms-item-cat">
                        {r.category.split(">").pop().trim()}
                      </span>
                    )}
                    {r.avg_rating != null && (
                      <span className="ms-item-star">
                        <Star size={11} fill="currentColor" /> {r.avg_rating}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
