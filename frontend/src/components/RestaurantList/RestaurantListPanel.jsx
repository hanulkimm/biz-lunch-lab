// 식당 목록 패널 — 리뷰가 있는 식당을 마커 카드 느낌으로 나열. 카드 클릭 시 지도 이동.
// 데이터는 Map이 이미 불러온 restaurants(getRestaurants: 리뷰 1개 이상 식당)를 그대로 받는다.
import { MapPin, Minus, Star } from "lucide-react";

function Stars({ value = 0 }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          fill={n <= Math.round(value) ? "currentColor" : "none"}
          color={n <= Math.round(value) ? "var(--star)" : "#e4d6b5"}
        />
      ))}
    </span>
  );
}

export default function RestaurantListPanel({ restaurants = [], onSelect, onClose }) {
  // 리뷰 많은 순 → 평점 높은 순으로 정렬
  const list = [...restaurants].sort(
    (a, b) =>
      (b.review_count || 0) - (a.review_count || 0) ||
      (b.avg_rating || 0) - (a.avg_rating || 0)
  );

  return (
    <aside className="chat-col">
      <div className="cp-head">
        <div className="rv-head-ic">📋</div>
        <div style={{ flex: 1 }}>
          <div className="cp-title">식당 목록<span className="dot" /></div>
          <div className="cp-status">리뷰가 남겨진 식당 {list.length}곳</div>
        </div>
        <button className="panel-close" onClick={onClose} aria-label="목록 닫기">
          <Minus size={15} />
        </button>
      </div>

      <div className="cp-list rl-list">
        {list.length === 0 && (
          <div className="rv-empty">
            <div className="e">🌱</div>
            <p>아직 리뷰가 있는 식당이 없어요.<br />첫 기록을 남겨보세요!</p>
          </div>
        )}

        {list.map((r) => {
          const address = r.road_address || r.address;
          return (
            <button key={r.id} className="rl-card" onClick={() => onSelect?.(r)}>
              <div className="rl-card-head">
                {r.category && (
                  <span className="rl-cat">{r.category.split(">").pop().trim()}</span>
                )}
                <span className="rl-name">{r.name}</span>
              </div>

              {address && (
                <div className="rl-addr"><MapPin size={12} /> {address}</div>
              )}

              <div className="rl-rate">
                <Stars value={r.avg_rating || 0} />
                {r.avg_rating != null && <span className="rl-score">{r.avg_rating.toFixed(1)}</span>}
                <span className="rl-count">리뷰 {r.review_count || 0}</span>
              </div>

              <span className="rl-go"><MapPin size={13} /> 지도에서 위치 보기</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
