// 아직 안 만든 섹션용 동물의 숲 톤 플레이스홀더 (상단 헤더 + 안내 카드).
import AppHeader from "./AppHeader";
import "./coming.css";

export default function ComingSoon({ active, emoji, title, desc }) {
  return (
    <div className="gw-page">
      <AppHeader active={active} />
      <div className="coming">
        <div className="coming-card">
          <div className="coming-emoji">{emoji}</div>
          <h1>{title}</h1>
          <p>{desc}</p>
          <span className="coming-badge">🌱 곧 만나요</span>
        </div>
      </div>
    </div>
  );
}
