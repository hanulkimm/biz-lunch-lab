// 메뉴 룰렛 — 8개 카테고리 휠을 돌려 카테고리 결정 → 해당 식당 랜덤 추천.
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Star } from "lucide-react";

import { getRoulette } from "../api/restaurants";
import AppHeader from "../components/common/AppHeader";
import "./roulette.css";

const CATS = [
  { name: "한식", emoji: "🍚", color: "#FBD45B" },
  { name: "일식", emoji: "🍣", color: "#9FDCEA" },
  { name: "중식", emoji: "🥟", color: "#F4796A" },
  { name: "양식", emoji: "🍝", color: "#C7A6E8" },
  { name: "분식", emoji: "🍢", color: "#F6A9C4" },
  { name: "고기", emoji: "🍖", color: "#E89B6C" },
  { name: "카페", emoji: "☕", color: "#A8D88A" },
  { name: "랜덤", emoji: "🎲", color: "#6FCEC6" },
];
const SEG = 360 / CATS.length;
const WHEEL_BG = `conic-gradient(${CATS.map(
  (c, i) => `${c.color} ${i * SEG}deg ${(i + 1) * SEG}deg`
).join(", ")})`;

export default function Roulette() {
  const navigate = useNavigate();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const timer = useRef(null);

  const spin = () => {
    if (spinning) return;
    setResult(null);
    setSpinning(true);
    const i = Math.floor(Math.random() * CATS.length);
    const targetMod = (360 - (i * SEG + SEG / 2)) % 360; // 세그먼트 중심을 포인터(위)로
    setRotation((prev) => {
      let next = prev - (prev % 360) + 360 * 6 + targetMod;
      if (next <= prev) next += 360;
      return next;
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const cat = CATS[i].name;
      try {
        const restaurant = await getRoulette(cat);
        setResult({ cat, restaurant });
      } catch {
        setResult({ cat, restaurant: null });
      }
      setSpinning(false);
    }, 4200);
  };

  return (
    <div className="gw-page">
      <AppHeader active="roulette" />
      <div className="rl">
        <h1>🎲 메뉴 룰렛</h1>
        <p className="rl-desc">오늘 뭐 먹지? 휠을 돌려서 점심을 정해요!</p>

        <div className="rl-stage">
          <div className="rl-pointer" />
          <div className="rl-wheel" style={{ background: WHEEL_BG, transform: `rotate(${rotation}deg)` }}>
            {CATS.map((c, i) => (
              <span
                key={c.name}
                className="rl-emoji"
                style={{
                  transform: `rotate(${i * SEG + SEG / 2}deg) translateY(-112px) rotate(${-(i * SEG + SEG / 2)}deg)`,
                }}
              >
                {c.emoji}
              </span>
            ))}
          </div>
          <button className="rl-hub" onClick={spin} disabled={spinning}>
            {spinning ? "도는 중" : "돌리기"}
          </button>
        </div>

        {result && (
          <div className="rl-result">
            <span className="rl-result-cat">{result.cat}</span>
            {result.restaurant ? (
              <>
                {result.restaurant.is_discovery && (
                  <span className="rl-badge">🌱 새로운 발견</span>
                )}
                <div className="rl-result-name">{result.restaurant.name}</div>
                <div className="rl-result-meta">
                  <span>{result.restaurant.category?.split(">").pop().trim()}</span>
                  {result.restaurant.avg_rating != null && (
                    <span className="star"><Star size={14} fill="currentColor" /> {result.restaurant.avg_rating}</span>
                  )}
                </div>
                {result.restaurant.is_discovery && (
                  <p className="rl-discovery-hint">
                    아직 아무도 기록하지 않은 곳이에요 — 첫 리뷰의 주인공이 되어보세요!
                  </p>
                )}
                <div className="rl-actions">
                  <button
                    className="btn-leaf"
                    onClick={() =>
                      navigate("/map", {
                        state: result.restaurant.id
                          ? { focusId: result.restaurant.id }
                          : { focusPlace: result.restaurant },
                      })
                    }
                  >
                    <MapPin size={16} /> 지도에서 보기
                  </button>
                  <button className="rl-again" onClick={spin}>다시 돌리기</button>
                </div>
              </>
            ) : (
              <>
                <p className="rl-result-empty">
                  이 카테고리엔 아직 등록된 식당이 없어요.
                  <br />리뷰를 남기면 룰렛에 등장해요! 🌱
                </p>
                <div className="rl-actions">
                  <button className="rl-again" onClick={spin}>다시 돌리기</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
