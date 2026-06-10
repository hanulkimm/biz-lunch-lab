// 마커 클릭 시 슬라이드인되는 식당 정보 패널 — 상세 + 리뷰 목록.
import { useEffect, useState } from "react";

import { getRestaurant } from "../../api/restaurants";

function avg(reviews) {
  if (!reviews?.length) return null;
  return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
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

  return (
    <aside className="panel">
      <button className="panel-close" onClick={onClose}>
        ✕
      </button>

      {loading && <p className="panel-loading">불러오는 중…</p>}

      {data && (
        <>
          <h2 className="panel-title">{data.name}</h2>
          <p className="panel-cat">{data.category}</p>
          <p className="panel-addr">{data.road_address || data.address}</p>
          {avg(reviews) && (
            <p className="panel-rating">
              ⭐ {avg(reviews)} · 리뷰 {reviews.length}개
            </p>
          )}
          {data.kakao_url && (
            <a className="panel-link" href={data.kakao_url} target="_blank" rel="noreferrer">
              카카오맵에서 보기 →
            </a>
          )}

          <hr />

          <h3 className="panel-sub">리뷰</h3>
          {reviews.length === 0 && <p className="panel-empty">아직 리뷰가 없습니다.</p>}
          {reviews.map((rv) => (
            <div key={rv.id} className="review-item">
              <div className="review-head">
                <span>⭐ {rv.rating}</span>
                <span className="review-author">{rv.users?.name}</span>
              </div>
              <div className="review-tags">
                {(rv.review_tags || []).map((rt, i) => (
                  <span key={i} className="tag">
                    {rt.tags?.name}
                  </span>
                ))}
              </div>
              {rv.comment && <p className="review-comment">{rv.comment}</p>}
            </div>
          ))}
        </>
      )}
    </aside>
  );
}
