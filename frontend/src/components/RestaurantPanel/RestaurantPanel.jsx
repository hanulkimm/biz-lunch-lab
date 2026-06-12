// 마커 클릭 시 슬라이드인되는 식당 정보 패널 — 동물의 숲 카드 스타일.
import { useEffect, useState } from "react";
import { MapPin, Navigation, Star, X } from "lucide-react";

import { getRestaurant } from "../../api/restaurants";

const TAG_COLORS = [
  { bg: "var(--leaf-soft)", fg: "var(--ink-green-2)" },
  { bg: "var(--sea-soft)", fg: "#2e6e7e" },
  { bg: "var(--sun-soft)", fg: "#9a6b0e" },
];

function Stars({ value = 0, size = 18 }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= Math.round(value) ? "currentColor" : "none"}
          color={n <= Math.round(value) ? "var(--star)" : "#e4d6b5"}
        />
      ))}
    </span>
  );
}

function avg(reviews) {
  if (!reviews?.length) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

export default function RestaurantPanel({ restaurantId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    setData(null);
    getRestaurant(restaurantId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [restaurantId]);

  if (!restaurantId) return null;

  const reviews = data?.reviews || [];
  const rating = avg(reviews);

  return (
    <aside className="panel">
      {loading && <p className="rp-empty">불러오는 중…</p>}

      {data && (
        <>
          <div className="rp-top">
            <div>
              {data.category && <span className="rp-cat">{data.category.split(">").pop().trim()}</span>}
              <h2 className="rp-title">{data.name}</h2>
            </div>
            <button className="panel-close" onClick={onClose} aria-label="닫기">
              <X size={16} />
            </button>
          </div>

          <div className="rp-addr">
            <MapPin size={13} /> {data.road_address || data.address}
          </div>

          {rating != null && (
            <div className="rp-rating">
              <Stars value={rating} />
              <span className="score">{rating.toFixed(1)}</span>
              <span className="count">리뷰 {reviews.length}</span>
            </div>
          )}

          {reviews.length > 0 && (
            <div className="rp-tags">
              {[...new Set(reviews.flatMap((rv) => (rv.review_tags || []).map((rt) => rt.tags?.name)))]
                .filter(Boolean)
                .slice(0, 6)
                .map((name, i) => (
                  <span
                    key={name}
                    className="tag"
                    style={{ background: TAG_COLORS[i % 3].bg, color: TAG_COLORS[i % 3].fg }}
                  >
                    {name}
                  </span>
                ))}
            </div>
          )}

          <hr className="rp-divider" />
          <h3 className="rp-sub">동료들의 기록</h3>
          {reviews.length === 0 && <p className="rp-empty">아직 기록이 없어요. 첫 기록을 남겨보세요!</p>}
          {reviews.map((rv) => (
            <div key={rv.id} className="review-card">
              <div className="review-card-head">
                <div className="review-ava">{rv.users?.name?.[0] || "주"}</div>
                <div style={{ flex: 1 }}>
                  <div className="review-card-name">{rv.users?.name}</div>
                  <div className="review-card-meta">
                    {(rv.created_at || "").slice(0, 10).replace(/-/g, ".")}
                  </div>
                </div>
                <div className="review-card-rate">
                  <Star size={13} fill="currentColor" /> {rv.rating}
                </div>
              </div>
              {rv.comment && <p>{rv.comment}</p>}
            </div>
          ))}

          {data.kakao_url && (
            <a className="btn-leaf" href={data.kakao_url} target="_blank" rel="noreferrer"
               style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
              <Navigation size={16} /> 길 안내 받기
            </a>
          )}
        </>
      )}
    </aside>
  );
}
