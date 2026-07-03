// 선택한 식당(카카오 검색/마커) 상세 플로팅 카드 — 리뷰 유무와 무관하게 표시 + 리뷰 추가.
import { useEffect, useState } from "react";
import { MapPin, Navigation, Pencil, Star, X } from "lucide-react";

import { getRestaurantByKakao } from "../../api/restaurants";

const TAG_COLORS = [
  { bg: "var(--leaf-soft)", fg: "var(--ink-green-2)" },
  { bg: "var(--sea-soft)", fg: "#2e6e7e" },
  { bg: "var(--sun-soft)", fg: "#9a6b0e" },
];

function Stars({ value = 0, size = 16 }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size}
          fill={n <= Math.round(value) ? "currentColor" : "none"}
          color={n <= Math.round(value) ? "var(--star)" : "#e4d6b5"} />
      ))}
    </span>
  );
}

const avg = (reviews) =>
  reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

export default function RestaurantPanel({ place, onClose, onWriteReview }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  // 선택한 place의 kakao_place_id로 DB 상세+리뷰 조회 (없으면 null → 리뷰 없는 식당)
  useEffect(() => {
    if (!place?.kakao_place_id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setDetail(null);
    getRestaurantByKakao(place.kakao_place_id)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [place?.kakao_place_id]);

  if (!place) return null;

  const reviews = detail?.reviews || [];
  const rating = avg(reviews);
  // 리뷰 전반의 대표 태그(중복 제거) — 너무 많이 보이지 않게 최대 4개 + "+N"
  const tagNames = [
    ...new Set(reviews.flatMap((rv) => (rv.review_tags || []).map((rt) => rt.tags?.name))),
  ].filter(Boolean);
  const category = place.category || detail?.category;
  const address =
    place.road_address || place.address || detail?.road_address || detail?.address;
  const kakaoUrl = place.kakao_url || detail?.kakao_url;

  return (
    <aside className="rp-float">
      <div className="rp-top">
        <div>
          {category && <span className="rp-cat">{category.split(">").pop().trim()}</span>}
          <h2 className="rp-title">{place.name}</h2>
        </div>
        <button className="panel-close" onClick={onClose} aria-label="닫기"><X size={15} /></button>
      </div>

      {address && <div className="rp-addr"><MapPin size={13} /> {address}</div>}

      {rating != null && (
        <div className="rp-rating">
          <Stars value={rating} />
          <span className="score">{rating.toFixed(1)}</span>
          <span className="count">리뷰 {reviews.length}</span>
        </div>
      )}

      {tagNames.length > 0 && (
        <div className="rp-tags">
          {tagNames.slice(0, 4).map((name, i) => (
            <span key={name} className="tag"
              style={{ background: TAG_COLORS[i % 3].bg, color: TAG_COLORS[i % 3].fg }}>
              {name}
            </span>
          ))}
          {tagNames.length > 4 && (
            <span className="tag" style={{ background: "var(--field)", color: "var(--muted)" }}>
              +{tagNames.length - 4}
            </span>
          )}
        </div>
      )}

      <hr className="rp-divider" />
      <h3 className="rp-sub">동료들의 기록</h3>
      {loading && <p className="rp-empty">불러오는 중…</p>}
      {!loading && reviews.length === 0 && (
        <p className="rp-empty">아직 기록이 없어요! 첫 리뷰를 남겨보세요 🌱</p>
      )}
      {reviews.map((rv) => (
        <div key={rv.id} className="review-card">
          <div className="review-card-head">
            <div className="review-ava">{rv.users?.name?.[0] || "주"}</div>
            <div style={{ flex: 1 }}>
              <div className="review-card-name">{rv.users?.name}</div>
              <div className="review-card-meta">{(rv.created_at || "").slice(0, 10).replace(/-/g, ".")}</div>
            </div>
            <div className="review-card-rate"><Star size={13} fill="currentColor" /> {rv.rating}</div>
          </div>
          {rv.comment && <p>{rv.comment}</p>}
        </div>
      ))}

      <button
        className="btn-leaf"
        onClick={() => onWriteReview?.(place)}
        style={{ width: "100%", justifyContent: "center", marginTop: 12, height: 42, fontSize: 14 }}
      >
        <Pencil size={15} /> 이 가게 리뷰 남기기
      </button>

      {kakaoUrl && (
        <a className="btn-leaf ghost" href={kakaoUrl} target="_blank" rel="noreferrer"
          style={{ width: "100%", justifyContent: "center", marginTop: 8, height: 42, fontSize: 14 }}>
          <Navigation size={15} /> 길 안내 받기
        </a>
      )}
    </aside>
  );
}
